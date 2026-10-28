import React, { useState } from 'react';
import {
  Trash2,
  AlertTriangle,
  Lightbulb,
  Droplets,
  CheckCircle2,

  AlertCircle,
  Loader2,
  ArrowRight,
  Info,
  Camera,
  X,
  Compass,
  Navigation,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { theme } from '../lib/theme';
import { BENGALURU_ZONES } from '../lib/authorities';

// Ensure Leaflet marker icons resolve correctly
delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface ReportIssueProps {
  deviceId: string;
  reporterLabel: string;
  onReportSuccess?: () => void;
}

interface IssueCategory {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

const CATEGORIES: IssueCategory[] = [
  {
    id: 'Garbage',
    name: 'Garbage',
    icon: Trash2,
    description: 'Uncollected waste, dumping, overflow',
  },
  {
    id: 'Potholes',
    name: 'Potholes',
    icon: AlertTriangle,
    description: 'Road damage, craters, pavement cracks',
  },
  {
    id: 'Streetlights',
    name: 'Streetlights',
    icon: Lightbulb,
    description: 'Non-functional or broken luminaires',
  },
  {
    id: 'Water Leakage',
    name: 'Water Leakage',
    icon: Droplets,
    description: 'Pipe bursts, valve leaks, supply waste',
  },
];

const BANGALORE_CENTER: [number, number] = [12.9716, 77.5946];

function LocationPicker({
  position,
  onLocationSelect,
}: {
  position: { lat: number; lng: number } | null;
  onLocationSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });

  return position ? <Marker position={[position.lat, position.lng]} /> : null;
}

// Client-side image compressor to preserve Firestore document size limits
function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDim = 800;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(e.target?.result as string);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.65));
      };
      img.onerror = reject;
      img.src = e.target?.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export const ReportIssue: React.FC<ReportIssueProps> = ({
  deviceId,
  reporterLabel,
  onReportSuccess,
}) => {
  const [category, setCategory] = useState<string>('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [zone, setZone] = useState<string>('');
  const [landmark, setLandmark] = useState<string>('');
  const [streetDetail, setStreetDetail] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isProcessingPhotos, setIsProcessingPhotos] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitFeedback, setSubmitFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  // 6. Make Zone and the map pin both required before Submit is enabled
  const isFormValid =
    Boolean(category) &&
    location !== null &&
    zone.trim().length > 0 &&
    description.trim().length > 0;

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhotos(true);
    try {
      const remainingSlots = 3 - photos.length;
      const filesToProcess = Array.from(files).slice(0, remainingSlots);

      const compressedPromises = filesToProcess.map((file) => compressImage(file));
      const compressedResults = await Promise.all(compressedPromises);

      setPhotos((prev) => [...prev, ...compressedResults].slice(0, 3));
    } catch (err) {
      console.error('Error processing photos:', err);
    } finally {
      setIsProcessingPhotos(false);
      e.target.value = '';
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    setPhotos((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid || !location) return;

    setIsSubmitting(true);
    setSubmitFeedback(null);

    try {
      // 5. Update Firestore "issues" document shape to include: zone, landmark, streetDetail
      const issuePayload = {
        category,
        lat: location.lat,
        lng: location.lng,
        zone: zone.trim(),
        landmark: landmark.trim(),
        streetDetail: streetDetail.trim(),
        areaName: zone.trim(), // backward-compatible mapping for older views
        address: [streetDetail.trim(), landmark.trim()].filter(Boolean).join(', '),
        description: description.trim(),
        photoUrls: photos,
        reportedBy: deviceId,
        reporterLabel: reporterLabel,
        createdAt: serverTimestamp(),
        status: 'reported',
        repostCount: 0,
        repostedBy: [] as string[],
      };

      await addDoc(collection(db, 'issues'), issuePayload);

      setSubmitFeedback({
        type: 'success',
        message: `Complaint registered in ${zone} under ${reporterLabel}. Track progress in "My Complaints".`,
      });

      // Reset form
      setCategory('');
      setLocation(null);
      setZone('');
      setLandmark('');
      setStreetDetail('');
      setDescription('');
      setPhotos([]);
    } catch (err: unknown) {
      console.error('Error submitting issue:', err);
      const errorMessage =
        err instanceof Error ? err.message : 'Failed to submit report. Please check connection.';
      setSubmitFeedback({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Raise a Civic Complaint
        </h1>
        <p className="text-sm text-slate-500 mt-1 leading-relaxed">
          Logged anonymously as <span className="font-semibold text-slate-800">{reporterLabel}</span>. Automatically scheduled for municipal escalation if unresolved.
        </p>
      </div>

      {/* Semantic Alert Banner */}
      {submitFeedback && (
        <div
          role="alert"
          className={`mb-6 p-4 rounded-xl border transition-all duration-200 flex items-start gap-3 shadow-2xs ${
            submitFeedback.type === 'success'
              ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900'
              : 'bg-rose-50/80 border-rose-200 text-rose-900'
          }`}
        >
          {submitFeedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 mt-0.5 shrink-0" />
          )}
          <div className="flex-1 text-sm">
            <p className="font-semibold">{submitFeedback.message}</p>
            {submitFeedback.type === 'success' && onReportSuccess && (
              <button
                type="button"
                onClick={onReportSuccess}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 underline cursor-pointer"
              >
                Go to My Complaints
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSubmitFeedback(null)}
            className="text-xs font-semibold opacity-70 hover:opacity-100 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Form Container */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 1. Category Selector */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                1. Select Issue Category
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Classifies the municipal jurisdiction and escalation officer.
              </p>
            </div>
            <span className="text-xs text-rose-500 font-medium">Required</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;

              return (
                <button
                  type="button"
                  key={cat.id}
                  onClick={() => setCategory(cat.id)}
                  className={`p-4 rounded-xl border text-left transition-all duration-200 cursor-pointer flex items-start gap-3.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 ${
                    isSelected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70 text-slate-800'
                  }`}
                >
                  <div
                    className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                      isSelected
                        ? 'bg-slate-800 text-white'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    <Icon className="w-4 h-4 stroke-[2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`block text-sm font-semibold leading-tight ${
                        isSelected ? 'text-white' : 'text-slate-900'
                      }`}
                    >
                      {cat.name}
                    </span>
                    <span
                      className={`block text-xs mt-0.5 line-clamp-1 ${
                        isSelected ? 'text-slate-300' : 'text-slate-500'
                      }`}
                    >
                      {cat.description}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Map Location Picker with 4. Read-Only Pinned Text */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 tracking-tight">
                2. Geo-Tag Location Pin
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Drop a pin precisely on the map where the incident occurred.
              </p>
            </div>
            {location ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/90">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Pin Placed
              </span>
            ) : (
              <span className="text-xs text-rose-600 bg-rose-50 px-2.5 py-1 rounded-md font-medium border border-rose-200/80">
                Pin Required *
              </span>
            )}
          </div>

          {/* Interactive Map */}
          <div className="w-full h-72 sm:h-80 rounded-lg overflow-hidden border border-slate-200 relative z-0">
            <MapContainer
              center={BANGALORE_CENTER}
              zoom={12}
              scrollWheelZoom={false}
              className="w-full h-full"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationPicker
                position={location}
                onLocationSelect={(lat, lng) => setLocation({ lat, lng })}
              />
            </MapContainer>
          </div>

          {/* 4. Small read-only text under the map to visually confirm coordinates */}
          <div className="flex items-center justify-between gap-2 mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <Navigation className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span>Tap anywhere on the map to position the marker.</span>
            </div>

            <div className="font-mono text-xs">
              {location ? (
                <span className="text-slate-800 font-semibold bg-slate-100 px-2 py-0.5 rounded border border-slate-200/80">
                  Pinned: {location.lat.toFixed(4)}, {location.lng.toFixed(4)}
                </span>
              ) : (
                <span className="text-slate-400 italic">No location pinned yet</span>
              )}
            </div>
          </div>
        </div>

        {/* 3. New "Address Details" Section Appearing Below the Map Pin Selector */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="mb-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Compass className="w-4 h-4 text-slate-700" />
              3. Address Details
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Select your administrative zone and provide landmark guidance for municipal inspection crews.
            </p>
          </div>

          {/* 1. Zone/Area Dropdown (Required) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label htmlFor="zoneSelect" className={theme.input.label}>
                Zone / Area <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] text-slate-400">BBMP Administrative Zone</span>
            </div>
            <select
              id="zoneSelect"
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className={`${theme.input.base} cursor-pointer`}
            >
              <option value="">Select Official Zone / Area…</option>
              {BENGALURU_ZONES.map((z) => (
                <option key={z.id} value={z.name}>
                  {z.name} — {z.localities}
                </option>
              ))}
            </select>
            <p className={theme.input.helper}>
              Ensures automatic routing directly to the designated zonal engineering division.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            {/* 2. Nearby Landmark (Optional with Hint) */}
            <div>
              <label htmlFor="landmarkInput" className={theme.input.label}>
                Nearby Landmark <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="landmarkInput"
                type="text"
                value={landmark}
                onChange={(e) => setLandmark(e.target.value)}
                placeholder="e.g. Opposite Cauvery Bakery"
                className={theme.input.base}
              />
              {/* 6. Small gray hint text if left empty */}
              {landmark.trim().length === 0 && (
                <p className="text-xs text-slate-400 mt-1 italic">
                  Adding a landmark helps authorities locate the issue faster
                </p>
              )}
            </div>

            {/* 3. Street / Locality Detail (Optional) */}
            <div>
              <label htmlFor="streetDetailInput" className={theme.input.label}>
                Street / Locality Detail <span className="text-slate-400 font-normal">(Optional)</span>
              </label>
              <input
                id="streetDetailInput"
                type="text"
                value={streetDetail}
                onChange={(e) => setStreetDetail(e.target.value)}
                placeholder="e.g. 16th Main Road, 4th Cross"
                className={theme.input.base}
              />
              <p className={theme.input.helper}>
                Cross street, lane, or house number if applicable.
              </p>
            </div>
          </div>
        </div>

        {/* 4. Incident Description & Photo Evidence */}
        <div className="bg-white rounded-xl border border-slate-200/90 p-5 sm:p-6 shadow-2xs space-y-4">
          <div className="mb-2">
            <h2 className="text-sm font-bold text-slate-900 tracking-tight">
              4. Incident Description & Photos
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Specific descriptions and photographic evidence accelerate grievance triage.
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className={theme.input.label}>
              Describe the Issue <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Garbage not collected for 5 days near the main road; obstructing traffic."
              className={`${theme.input.base} resize-y leading-relaxed`}
            />
          </div>

          {/* Photos Attachment */}
          <div>
            <label className={theme.input.label}>
              Incident Photos <span className="text-slate-400 font-normal">(Up to 3 images)</span>
            </label>

            {/* Photo Previews */}
            {photos.length > 0 && (
              <div className="flex flex-wrap gap-3 mb-3">
                {photos.map((photo, idx) => (
                  <div
                    key={idx}
                    className="relative w-20 h-20 rounded-lg overflow-hidden border border-slate-200 group shadow-2xs"
                  >
                    <img
                      src={photo}
                      alt={`Evidence ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(idx)}
                      className="absolute top-1 right-1 w-5 h-5 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full flex items-center justify-center transition-colors cursor-pointer"
                      title="Remove image"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < 3 && (
              <label
                className={`flex items-center justify-center gap-2 p-3.5 border-2 border-dashed border-slate-200 hover:border-slate-400 rounded-lg text-xs font-medium text-slate-600 bg-slate-50/70 hover:bg-slate-100/70 transition-colors cursor-pointer ${
                  isProcessingPhotos ? 'opacity-50 pointer-events-none' : ''
                }`}
              >
                <Camera className="w-4 h-4 text-slate-500" />
                <span>
                  {isProcessingPhotos
                    ? 'Processing Image…'
                    : photos.length === 0
                    ? 'Attach photo evidence (Camera / File)'
                    : `Add another photo (${3 - photos.length} remaining)`}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
            )}
          </div>
        </div>

        {/* 5. Action Row */}
        <div className="flex items-center justify-between pt-2">
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            <span>Category, Map Pin, Zone, and Description are required to submit.</span>
          </div>
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`${theme.button.primary} w-full sm:w-auto min-w-[170px]`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Filing Complaint…
              </>
            ) : (
              'Raise Complaint'
            )}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportIssue;

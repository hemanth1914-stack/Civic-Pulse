import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';
import {
  Trash2,
  AlertTriangle,
  Lightbulb,
  Droplets,
  Clock,
  MapPin,
  Loader2,
  FileText,
  Search,

  CheckCircle2,
  Check,
  FileQuestion,
  Filter,
  User,
  Building,
  Image as ImageIcon,
  X,
  Map as MapIcon,
  List,
  Repeat2,
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { db } from '../lib/firebase';
import { getAuthorityForCategory } from '../lib/authorities';
import type { CivicAuthority } from '../lib/authorities';
import { draftEscalationEmail } from '../lib/gemini';
import { theme } from '../lib/theme';
import EscalationModal from './EscalationModal';
import EmptyState from './EmptyState';

export interface CommunityIssue {
  id: string;
  category: string;
  lat: number;
  lng: number;
  areaName: string;
  zone?: string;
  landmark?: string;
  streetDetail?: string;
  address?: string;
  description: string;
  photoUrls?: string[];
  reportedBy: string;
  reporterLabel?: string;
  createdAt?: {
    toDate?: () => Date;
    seconds?: number;
  } | null;
  resolvedAt?: {
    toDate?: () => Date;
    seconds?: number;
  } | null;
  status: 'reported' | 'escalated' | 'resolved' | string;
  repostCount: number;
  repostedBy?: string[];
  escalationEmailDraft?: string;
}

interface CommunityFeedProps {
  deviceId: string;
  mode: 'all' | 'mine';
  onNavigateToRaise?: () => void;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Garbage: Trash2,
  Potholes: AlertTriangle,
  Streetlights: Lightbulb,
  'Water Leakage': Droplets,
};

const BANGALORE_CENTER: [number, number] = [12.9716, 77.5946];

// Helper to create customized SVG pin markers for Leaflet overview map
const createMarkerIcon = (isResolved: boolean, isEscalated: boolean) => {
  // 3. Green pin for resolved, amber for escalated, slate-900 for reported
  const pinColor = isResolved ? '#059669' : isEscalated ? '#d97706' : '#0f172a';
  const badgeIcon = isResolved ? '✓' : '!';

  const svg = `<div style="display:flex;flex-direction:column;align-items:center;cursor:pointer;">
    <div style="background-color:${pinColor};color:white;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);border:2px solid white;font-size:12px;font-weight:bold;">
      ${badgeIcon}
    </div>
    <div style="width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${pinColor};margin-top:-1px;"></div>
  </div>`;

  return L.divIcon({
    html: svg,
    className: 'custom-civic-pin',
    iconSize: [28, 35],
    iconAnchor: [14, 35],
    popupAnchor: [0, -35],
  });
};

export const CommunityFeed: React.FC<CommunityFeedProps> = ({
  deviceId,
  mode,
  onNavigateToRaise,
}) => {
  const [issues, setIssues] = useState<CommunityIssue[]>([]);
  const [loading, setLoading] = useState(true);
  const [escalatingId, setEscalatingId] = useState<string | null>(null);
  const [confirmResolvingId, setConfirmResolvingId] = useState<string | null>(null);
  const [isResolvingId, setIsResolvingId] = useState<string | null>(null);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [viewFormat, setViewFormat] = useState<'list' | 'map'>('list');
  const [expandedPhoto, setExpandedPhoto] = useState<string | null>(null);
  const [animatingSupportId, setAnimatingSupportId] = useState<string | null>(null);

  // Modal State
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    authority: CivicAuthority;
    emailText: string;
    category: string;
    areaName: string;
  } | null>(null);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'issues'),
      (snapshot) => {
        const items: CommunityIssue[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CommunityIssue, 'id'>),
        }));

        // 4. In Community Feed, resolved issues sort to the bottom by default
        items.sort((a, b) => {
          const isResolvedA = a.status === 'resolved' ? 1 : 0;
          const isResolvedB = b.status === 'resolved' ? 1 : 0;

          // Push resolved (1) below active/escalated (0)
          if (isResolvedA !== isResolvedB) {
            return isResolvedA - isResolvedB;
          }

          // Secondary sort: newest first
          const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
          const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
          return timeB - timeA;
        });

        setIssues(items);
        setLoading(false);
      },
      (error) => {
        console.error('Firestore onSnapshot error:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filter issues according to mode (all vs mine), category, and search query
  const filteredIssues = useMemo(() => {
    return issues.filter((issue) => {
      // My Complaints mode: filters to only documents where reportedBy === current deviceId
      if (mode === 'mine' && issue.reportedBy !== deviceId) {
        return false;
      }

      // Category filter
      if (categoryFilter !== 'all' && issue.category !== categoryFilter) {
        return false;
      }

      // Search query filter (matches area, zone, landmark, streetDetail, description, or reporterLabel)
      if (searchQuery.trim().length > 0) {
        const query = searchQuery.toLowerCase();
        const matchesArea = issue.areaName.toLowerCase().includes(query);
        const matchesZone = issue.zone?.toLowerCase().includes(query) ?? false;
        const matchesLandmark = issue.landmark?.toLowerCase().includes(query) ?? false;
        const matchesStreet = issue.streetDetail?.toLowerCase().includes(query) ?? false;
        const matchesAddress = issue.address?.toLowerCase().includes(query) ?? false;
        const matchesDesc = issue.description.toLowerCase().includes(query);
        const matchesCat = issue.category.toLowerCase().includes(query);
        const matchesReporter = issue.reporterLabel?.toLowerCase().includes(query) ?? false;
        return (
          matchesArea ||
          matchesZone ||
          matchesLandmark ||
          matchesStreet ||
          matchesAddress ||
          matchesDesc ||
          matchesCat ||
          matchesReporter
        );
      }

      return true;
    });
  }, [issues, mode, categoryFilter, searchQuery, deviceId]);

  // 1 & 2. Mark as Resolved handler
  const handleMarkResolved = async (issueId: string) => {
    setIsResolvingId(issueId);
    try {
      const issueRef = doc(db, 'issues', issueId);
      await updateDoc(issueRef, {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
      });
      setConfirmResolvingId(null);
    } catch (err) {
      console.error('Error resolving issue:', err);
      alert('Could not update status to resolved. Please check connection.');
    } finally {
      setIsResolvingId(null);
    }
  };

  // Support / Repost handler
  const handleSupport = async (issue: CommunityIssue) => {
    if (issue.status === 'resolved') return;
    if (issue.repostedBy?.includes(deviceId)) return;

    // Trigger pop-bounce and count pop animation
    setAnimatingSupportId(issue.id);
    setTimeout(() => {
      setAnimatingSupportId((prev) => (prev === issue.id ? null : prev));
    }, 350);

    try {
      const issueRef = doc(db, 'issues', issue.id);
      await updateDoc(issueRef, {
        repostCount: (issue.repostCount || 0) + 1,
        repostedBy: arrayUnion(deviceId),
      });
    } catch (err) {
      console.error('Error supporting issue:', err);
    }
  };

  // Simulate Time Passing handler
  const handleSimulateTimePassing = async (issue: CommunityIssue) => {
    setEscalatingId(issue.id);
    const activeZone = issue.zone || issue.areaName;
    const authority = getAuthorityForCategory(issue.category, activeZone);

    try {
      const emailDraft =
        issue.escalationEmailDraft ||
        (await draftEscalationEmail({
          id: issue.id,
          category: issue.category,
          areaName: activeZone,
          zone: issue.zone,
          landmark: issue.landmark,
          streetDetail: issue.streetDetail,
          description: issue.description,
          repostCount: issue.repostCount || 0,
          lat: issue.lat,
          lng: issue.lng,
        }));

      const issueRef = doc(db, 'issues', issue.id);
      await updateDoc(issueRef, {
        status: 'escalated',
        escalationEmailDraft: emailDraft,
      });

      setModalState({
        isOpen: true,
        authority,
        emailText: emailDraft,
        category: issue.category,
        areaName: activeZone,
      });
    } catch (err) {
      console.error('Error escalating issue:', err);
      alert('Could not complete escalation simulation. Please check network connection.');
    } finally {
      setEscalatingId(null);
    }
  };

  const handleViewEscalation = (issue: CommunityIssue) => {
    const activeZone = issue.zone || issue.areaName;
    const authority = getAuthorityForCategory(issue.category, activeZone);
    setModalState({
      isOpen: true,
      authority,
      emailText: issue.escalationEmailDraft || 'Escalation draft not found.',
      category: issue.category,
      areaName: activeZone,
    });
  };

  const resolvedCount = useMemo(
    () => issues.filter((i) => (mode === 'mine' ? i.reportedBy === deviceId : true) && i.status === 'resolved').length,
    [issues, mode, deviceId]
  );

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/90">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {mode === 'mine' ? 'My Complaints' : 'Community Feed'}
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {mode === 'mine'
              ? 'Tracking grievances lodged from your device and verifying municipal resolution.'
              : 'Live municipal grievance registry with active escalation tracking across Bengaluru.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
          {resolvedCount > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs bg-emerald-50 text-emerald-800 px-3 py-1.5 rounded-lg border border-emerald-200 font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              {resolvedCount} Resolved
            </span>
          )}
          <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
            {filteredIssues.length} {filteredIssues.length === 1 ? 'Complaint' : 'Complaints'}
          </span>
        </div>
      </div>

      {/* Filter & View Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200/90 p-3.5 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by area, landmark, citizen ID, keyword…"
            className="w-full pl-9 pr-3.5 py-1.5 text-xs sm:text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 focus-visible:bg-white transition-all duration-200"
          />
        </div>

        <div className="flex items-center gap-2.5">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="text-xs sm:text-sm bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-3 rounded-lg focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-slate-900 cursor-pointer"
            >
              <option value="all">All Categories</option>
              <option value="Garbage">Garbage</option>
              <option value="Potholes">Potholes</option>
              <option value="Streetlights">Streetlights</option>
              <option value="Water Leakage">Water Leakage</option>
            </select>
          </div>

          {/* List vs Map View Switcher */}
          <div className="inline-flex p-1 bg-slate-100 rounded-lg border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewFormat('list')}
              title="List View"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewFormat === 'list'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewFormat('map')}
              title="Interactive Map View"
              className={`p-1.5 rounded-md transition-colors cursor-pointer ${
                viewFormat === 'map'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <MapIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-slate-700" />
          <p className="text-xs font-medium tracking-wide text-slate-500">
            Synchronizing complaints registry…
          </p>
        </div>
      ) : filteredIssues.length === 0 ? (
        /* Empty State */
        <EmptyState
          icon={FileQuestion}
          title={
            mode === 'mine'
              ? 'No complaints raised yet'
              : 'No matching complaints found'
          }
          description={
            mode === 'mine'
              ? 'You have not lodged any civic complaints from this browser. Raise an issue to monitor automated municipal escalation and track resolution.'
              : searchQuery || categoryFilter !== 'all'
              ? 'No issues match your current filters. Try resetting the category or search text.'
              : 'The public registry is clear. Be the first citizen to report an infrastructure or sanitation problem.'
          }
          actionLabel="Raise a Complaint"
          onAction={onNavigateToRaise}
        />
      ) : viewFormat === 'map' ? (
        /* 3. Interactive Overview Map View (Map pins turn green for resolved issues) */
        <div className="bg-white rounded-xl border border-slate-200/90 p-4 shadow-2xs space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-600 px-1">
            <span className="font-semibold text-slate-900">
              Bengaluru Grievance Map ({filteredIssues.length} Pinned Incidents)
            </span>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-900"></span>
                Reported
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>
                Escalated
              </span>
              <span className="inline-flex items-center gap-1.5 text-emerald-700 font-medium">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span>
                Resolved (Green Pin)
              </span>
            </div>
          </div>

          <div className="w-full h-96 sm:h-[450px] rounded-lg overflow-hidden border border-slate-200 relative z-0">
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
              {filteredIssues
                .filter((issue) => issue.lat && issue.lng)
                .map((issue) => {
                  const isResolved = issue.status === 'resolved';
                  const isEscalated = issue.status === 'escalated';
                  const pinIcon = createMarkerIcon(isResolved, isEscalated);

                  return (
                    <Marker
                      key={issue.id}
                      position={[issue.lat, issue.lng]}
                      icon={pinIcon}
                    >
                      <Popup>
                        <div className="text-xs space-y-1 p-0.5">
                          <div className="font-bold text-slate-900 text-sm">
                            {issue.category}
                          </div>
                          <div className="text-slate-600 font-medium">
                            {issue.zone || issue.areaName}
                          </div>
                          {issue.landmark && (
                            <div className="text-slate-500">
                              Near: {issue.landmark}
                            </div>
                          )}
                          <div className="text-slate-700 pt-1 border-t border-slate-100">
                            {issue.description}
                          </div>
                          <div className="pt-1 font-semibold">
                            Status: <span className={isResolved ? 'text-emerald-600' : isEscalated ? 'text-amber-600' : 'text-slate-600'}>{issue.status}</span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
            </MapContainer>
          </div>
        </div>
      ) : (
        /* Issue Cards List */
        <div className="space-y-4">
          {filteredIssues.map((issue) => {
            const Icon = CATEGORY_ICONS[issue.category] || AlertTriangle;
            const isResolved = issue.status === 'resolved';
            const isEscalated = issue.status === 'escalated';
            const isEscalating = escalatingId === issue.id;
            const isMine = issue.reportedBy === deviceId;
            const isSupporting = issue.repostedBy?.includes(deviceId);
            const reportDate = issue.createdAt?.toDate ? issue.createdAt.toDate() : null;
            const isConfirming = confirmResolvingId === issue.id;

            const reporterDisplay =
              issue.reporterLabel ||
              (isMine ? 'You' : `Citizen #${issue.reportedBy.slice(0, 4).toUpperCase()}`);

            return (
              <article
                key={issue.id}
                className={`bg-white rounded-xl border p-5 sm:p-6 shadow-2xs transition-all duration-200 ${
                  isResolved
                    ? 'border-emerald-200/90 ring-1 ring-emerald-100/70'
                    : isEscalated
                    ? 'border-amber-200/90'
                    : 'border-slate-200/90 hover:border-slate-300'
                }`}
              >
                {/* Header: Category, Area, Address, Status Badge */}
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 border ${
                        isResolved
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                          : isEscalated
                          ? 'bg-amber-50 text-amber-700 border-amber-200/60'
                          : 'bg-slate-100 text-slate-800 border-slate-200/60'
                      }`}
                    >
                      {isResolved ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2]" />
                      ) : (
                        <Icon className="w-5 h-5 stroke-[1.75]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-slate-900 text-sm sm:text-base tracking-tight leading-snug">
                          {issue.category}
                        </h3>

                        {/* Public Citizen Identity Tag */}
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200">
                          <User className="w-3 h-3 text-slate-500" />
                          <span>{reporterDisplay}</span>
                          {isMine && (
                            <span className="text-[10px] text-emerald-700 font-semibold ml-0.5">
                              (You)
                            </span>
                          )}
                        </span>
                      </div>

                      {/* 3. Location, Zone, Landmark & Address with green pin if resolved */}
                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-500 mt-1">
                        <span
                          className={`inline-flex items-center gap-1 font-medium ${
                            isResolved ? 'text-emerald-800' : 'text-slate-700'
                          }`}
                        >
                          <MapPin
                            className={`w-3.5 h-3.5 shrink-0 ${
                              isResolved ? 'text-emerald-600' : 'text-slate-400'
                            }`}
                          />
                          {issue.zone || issue.areaName}
                        </span>

                        {issue.landmark && (
                          <>
                            <span className="text-slate-300">&middot;</span>
                            <span className="inline-flex items-center gap-1 text-slate-600 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200/80 font-normal">
                              Near: {issue.landmark}
                            </span>
                          </>
                        )}

                        {(issue.streetDetail || issue.address) && (
                          <>
                            <span className="text-slate-300">&middot;</span>
                            <span className="inline-flex items-center gap-1 text-slate-500">
                              <Building className="w-3 h-3 text-slate-400 shrink-0" />
                              {issue.streetDetail || issue.address}
                            </span>
                          </>
                        )}

                        {reportDate && (
                          <>
                            <span className="text-slate-300">&middot;</span>
                            <span>{reportDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* 3. Green Status Badge for Resolved */}
                  <div>
                    {isResolved ? (
                      <span className={theme.status.resolved}>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Resolved
                      </span>
                    ) : isEscalated ? (
                      <span className={theme.status.escalated}>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600"></span>
                        Escalated
                      </span>
                    ) : (
                      <span className={theme.status.reported}>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
                        Reported
                      </span>
                    )}
                  </div>
                </div>

                {/* Description Body */}
                <p className="text-sm text-slate-700 leading-relaxed font-normal mb-3.5 pl-0.5">
                  {issue.description}
                </p>

                {/* Photos Gallery */}
                {issue.photoUrls && issue.photoUrls.length > 0 && (
                  <div className="mb-4">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-1.5">
                      <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                      <span>Attached Evidence ({issue.photoUrls.length}):</span>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                      {issue.photoUrls.map((url, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setExpandedPhoto(url)}
                          className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg overflow-hidden border border-slate-200 hover:border-slate-400 transition-all cursor-pointer group shadow-2xs"
                          title="Click to view full image"
                        >
                          <img
                            src={url}
                            alt={`Evidence ${idx + 1}`}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta & Actions Row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                  {/* Metadata: Pinned Coordinates (Green if resolved) */}
                  <div className="flex items-center gap-2 text-slate-500">
                    {issue.lat && issue.lng && (
                      <span
                        className={`font-mono text-xs px-2.5 py-1 rounded-md border ${
                          isResolved
                            ? 'text-emerald-800 bg-emerald-50 border-emerald-200/80'
                            : 'text-slate-500 bg-slate-50 border-slate-200/80'
                        }`}
                      >
                        GPS: {issue.lat.toFixed(4)}, {issue.lng.toFixed(4)}
                      </span>
                    )}
                  </div>

                  {/* Actions Area */}
                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    {/* 1 & 2. "Mark as Resolved" Button - on "My Complaints" tab only for owner */}
                    {mode === 'mine' && isMine && !isResolved && (
                      <>
                        {isConfirming ? (
                          /* 2. Brief Confirm Step */
                          <div className="flex items-center gap-2 bg-emerald-50 p-1.5 px-3 rounded-lg border border-emerald-200 text-xs text-emerald-950 animate-in fade-in duration-150">
                            <span className="font-medium text-emerald-900">
                              Are you sure this issue has been resolved?
                            </span>
                            <button
                              type="button"
                              onClick={() => handleMarkResolved(issue.id)}
                              disabled={isResolvingId === issue.id}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
                            >
                              {isResolvingId === issue.id ? 'Updating…' : 'Yes, Confirm'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmResolvingId(null)}
                              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 rounded border border-slate-300 font-medium text-xs transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmResolvingId(issue.id)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Mark as Resolved
                          </button>
                        )}
                      </>
                    )}

                    {/* 3. Once resolved, replace support/repost button with small "✓ Resolved" label */}
                    {isResolved ? (
                      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                        Resolved
                      </span>
                    ) : (
                      <>
                        {/* 1 & 2. Social Repost / Support Button with Repeat2 icon and count */}
                        <button
                          type="button"
                          onClick={() => handleSupport(issue)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all duration-200 select-none ${
                            isSupporting
                              ? 'bg-indigo-50/90 text-indigo-700 border border-indigo-200/90 shadow-2xs font-semibold cursor-default'
                              : 'bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-300 hover:border-slate-400 cursor-pointer shadow-2xs active:scale-95'
                          }`}
                          title={isSupporting ? 'You supported this complaint' : 'Support / Repost complaint to prioritize municipal action'}
                        >
                          <Repeat2
                            className={`w-4 h-4 transition-all duration-200 ${
                              isSupporting
                                ? 'text-indigo-600 stroke-[2.25] fill-indigo-600/15'
                                : 'text-slate-500 hover:text-slate-800'
                            } ${
                              animatingSupportId === issue.id
                                ? 'animate-repost-pop text-indigo-600 fill-indigo-600/30'
                                : ''
                            }`}
                          />
                          <span
                            className={`font-semibold ${
                              isSupporting ? 'text-indigo-900 font-bold' : 'text-slate-700'
                            } ${animatingSupportId === issue.id ? 'animate-number-pop' : ''}`}
                          >
                            {issue.repostCount || 0}
                          </span>
                          <span className="text-[11px] font-normal text-slate-500 hidden sm:inline">
                            {isSupporting ? 'Supported' : 'Support'}
                          </span>
                        </button>

                        {/* Escalate / View Letter Button */}
                        {!isEscalated ? (
                          <button
                            type="button"
                            onClick={() => handleSimulateTimePassing(issue)}
                            disabled={isEscalating}
                            className={theme.button.secondary}
                            title="Simulate 3-4 days passing to trigger AI municipal escalation"
                          >
                            {isEscalating ? (
                              <>
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                Escalating…
                              </>
                            ) : (
                              <>
                                <Clock className="w-3.5 h-3.5 text-amber-600" />
                                Simulate Time Passing
                              </>
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleViewEscalation(issue)}
                            className={theme.button.secondary}
                          >
                            <FileText className="w-3.5 h-3.5 text-slate-500" />
                            View Escalation Letter
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Lightbox Photo Preview Modal */}
      {expandedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setExpandedPhoto(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200 cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl border border-slate-800"
          >
            <button
              type="button"
              onClick={() => setExpandedPhoto(null)}
              className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 transition-colors cursor-pointer z-10"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={expandedPhoto}
              alt="Expanded incident evidence"
              className="max-h-[85vh] w-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}

      {/* Escalation Dossier Modal */}
      {modalState && (
        <EscalationModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState(null)}
          authority={modalState.authority}
          emailText={modalState.emailText}
          category={modalState.category}
          areaName={modalState.areaName}
        />
      )}
    </div>
  );
};

export default CommunityFeed;

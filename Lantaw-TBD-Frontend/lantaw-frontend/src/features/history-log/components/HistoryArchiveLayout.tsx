import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import { historyLogApi } from "../services/historyLogApi";
import type { HistoryLog, HistoryLogFilters } from "../../../types/historyLog";
import { Card, CardContent } from "../../../components/common/card";
import { Button } from "../../../components/common/button";
import { Input } from "../../../components/common/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../../components/common/select";
import { Search, X, RotateCcw, Trash2 } from "lucide-react";
import { formatDateTime } from "../../../utils/formatHelpers";

const getActionDisplayName = (action: HistoryLog["action"]) => {
  switch (action) {
    case "CREATE":
      return "Create";
    case "UPDATE":
      return "Update";
    case "DELETE":
      return "Delete";
    case "REVERT":
      return "Revert";
    case "ASSIGN":
      return "Assign";
    case "APPROVE":
      return "Approve";
    case "REJECT":
      return "Reject";
    case "LOGIN":
      return "Login";
    case "LOGOUT":
      return "Logout";
    default:
      return action;
  }
};

export const HistoryArchiveLayout: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";
  const [entries, setEntries] = useState<HistoryLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<HistoryLogFilters>({});
  const [search, setSearch] = useState("");
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    const fetchEntries = async () => {
      if (!isAdmin) return;
      setLoading(true);
      setError(null);
      try {
        setEntries(await historyLogApi.getArchive({ ...filters, search: search.trim() || undefined }));

      } catch (err) {
        console.error("Failed to load archived history entries:", err);
        setError("Failed to load archived history entries.");
      } finally {
        setLoading(false);
      }

    };

    fetchEntries();
  }, [filters, search, isAdmin]);

  const visibleEntries = useMemo(() => {
    return [...entries].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }, [entries]);

  const hasActiveFilters = Boolean(filters.action || search.trim());

  const handleRestore = async (entryId: number) => {
    setProcessingAction(true);
    try {
      await historyLogApi.restoreArchive(entryId);
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    } catch (err) {
      console.error("Failed to restore archived entry:", err);
      setError("Failed to restore archived entry.");
    } finally {
      setProcessingAction(false);
    }
  };

  const handlePermanentDelete = async (entryId: number) => {
    if (!window.confirm("Permanently delete this archived history log? This cannot be undone.")) return;
    setProcessingAction(true);
    try {
      await historyLogApi.permanentDeleteArchive(entryId);
      setEntries((prev) => prev.filter((entry) => entry.id !== entryId));
    } catch (err) {
      console.error("Failed to permanently delete archived entry:", err);
      setError("Failed to permanently delete archived entry.");
    } finally {
      setProcessingAction(false);
    }
  };

  if (!isAdmin) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground">You do not have access to archived history logs.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Archive</h1>
          <p className="text-sm text-muted-foreground">Archived history entries are shown here and automatically purge after 30 days.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800">Archived</span>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 pt-6 sm:p-6">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:flex sm:flex-wrap sm:items-end sm:gap-3 md:gap-4">
              <div className="space-y-1.5 w-full min-w-0 sm:w-52 sm:flex-none">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search description..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full min-w-0 pl-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5 w-full min-w-0 sm:w-40 sm:flex-none">
                <label className="text-sm font-medium">Action</label>
                <Select value={filters.action || "all"} onValueChange={(value) => setFilters((prev) => ({ ...prev, action: value === "all" ? undefined : (value as HistoryLog["action"])}))}>
                  <SelectTrigger className="w-full min-w-0">
                    <SelectValue placeholder="All actions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All actions</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                    <SelectItem value="REVERT">Revert</SelectItem>
                    <SelectItem value="ASSIGN">Assign</SelectItem>
                    <SelectItem value="APPROVE">Approve</SelectItem>
                    <SelectItem value="REJECT">Reject</SelectItem>
                    <SelectItem value="LOGIN">Login</SelectItem>
                    <SelectItem value="LOGOUT">Logout</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {hasActiveFilters && (
                <Button variant="outline" size="sm" onClick={() => { setFilters({}); setSearch(""); }} className="w-full shrink-0 sm:w-auto">
                  <X className="h-3 w-3 mr-1 shrink-0" />
                  Clear
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {error && <div className="rounded-md border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">{error}</div>}

      {loading ? (
        <div className="rounded-md border bg-card p-8 text-center text-sm text-muted-foreground">Loading archived entries...</div>
      ) : visibleEntries.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">No archived entries found.</CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visibleEntries.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">Archived</span>
                      <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{getActionDisplayName(entry.action)}</span>
                    </div>
                    <p className="font-medium">{entry.description}</p>
                    <p className="text-sm text-muted-foreground">User: {entry.user_name || "Unknown"} • Project: {entry.project_name || "Unknown"} • Module: {entry.module || entry.change_type}</p>
                    <p className="text-sm text-muted-foreground">Remaining Days: {entry.remaining_days ?? 0}</p>
                  </div>
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                    <p>Archived Date: {formatDateTime(entry.archived_at || entry.timestamp)}</p>
                    <p>Purge Date: {entry.purge_at ? formatDateTime(entry.purge_at) : "Unknown"}</p>
                    <p>Original Action Date: {formatDateTime(entry.timestamp)}</p>
                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button variant="outline" size="sm" disabled={processingAction} onClick={() => { void handleRestore(entry.id); }}>
                        <RotateCcw className="mr-2 h-4 w-4" /> Restore
                      </Button>
                      <Button variant="destructive" size="sm" disabled={processingAction} onClick={() => { void handlePermanentDelete(entry.id); }}>
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

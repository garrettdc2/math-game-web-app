import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Rocket,
  Loader2,
  Upload,
  Info,
  FileText,
  Code,
  Image,
  Globe,
  X,
  Bold,
  Italic,
  Heading,
  List,
  Link,
  Plus,
  Check,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { startPipeline } from "@/lib/api";

interface AttachedFile {
  name: string;
  size: string;
  icon: React.ElementType;
}

interface ExternalLink {
  url: string;
}

interface Criterion {
  text: string;
  checked: boolean;
}

export default function NewPipelinePage() {
  const navigate = useNavigate();
  const [taskId, setTaskId] = useState(`PF-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999)).padStart(3, '0')}`);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<"details" | "resources" | "documentation">("details");

  // Resources state
  const [files, setFiles] = useState<AttachedFile[]>([]);
  const [links, setLinks] = useState<ExternalLink[]>([]);
  const [newLinkUrl, setNewLinkUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Documentation state
  const [docContent, setDocContent] = useState("");
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [newCriterion, setNewCriterion] = useState("");
  const [showCriterionInput, setShowCriterionInput] = useState(false);

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files || []).map(f => ({
      name: f.name,
      size: f.size > 1024 * 1024 ? `${(f.size / 1024 / 1024).toFixed(1)}MB` : `${(f.size / 1024).toFixed(0)}KB`,
      icon: f.name.endsWith('.pdf') ? FileText : f.name.endsWith('.json') ? Code : f.name.match(/\.(png|jpg|svg)$/) ? Image : FileText,
    }));
    setFiles(prev => [...prev, ...newFiles]);
    // Reset input so re-selecting the same file works
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleAddLink() {
    const trimmed = newLinkUrl.trim();
    if (!trimmed) return;
    setLinks(prev => [...prev, { url: trimmed }]);
    setNewLinkUrl("");
  }

  function handleAddCriterion() {
    const trimmed = newCriterion.trim();
    if (!trimmed) return;
    setCriteria(prev => [...prev, { text: trimmed, checked: false }]);
    setNewCriterion("");
    setShowCriterionInput(false);
  }

  function toggleCriterion(index: number) {
    setCriteria(prev => prev.map((c, i) => i === index ? { ...c, checked: !c.checked } : c));
  }

  // Spec completeness
  const specDetailsComplete = !!(taskId.trim() && title.trim());
  const resourcesComplete = files.length > 0 || links.length > 0;
  const documentationComplete = docContent.length > 0;
  const completeSections = [specDetailsComplete, resourcesComplete, documentationComplete].filter(Boolean).length;
  const completenessPercent = Math.round((completeSections / 3) * 100);

  async function handleSubmit(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!taskId.trim() || !title.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await startPipeline(taskId.trim(), title.trim());
      if (res.error) {
        setError(res.error);
      } else {
        navigate(`/pipeline/${res.task_id}`);
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Button
        variant="ghost"
        size="sm"
        className="mb-6"
        onClick={() => navigate("/")}
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back
      </Button>

      <div className="flex items-center gap-3 mb-2">
        <h1 className="text-xl font-semibold tracking-tight">Create New Spec</h1>
        <Badge variant="running">ARCHITECT MODE</Badge>
      </div>
      <p className="text-sm text-on-surface-variant mb-8">
        Define the structural requirements for the new pipeline iteration. Precision at this stage ensures optimal engine performance and data integrity.
      </p>

      {/* Tab Bar */}
      <div className="flex border-b border-outline-ghost/15 mb-10">
        <button
          type="button"
          className={tab === "details"
            ? "px-8 py-3 text-sm font-semibold text-primary border-b-2 border-primary"
            : "px-8 py-3 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"}
          onClick={() => setTab("details")}
        >
          Spec Details
        </button>
        <button
          type="button"
          className={tab === "resources"
            ? "px-8 py-3 text-sm font-semibold text-primary border-b-2 border-primary"
            : "px-8 py-3 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"}
          onClick={() => setTab("resources")}
        >
          Resources
        </button>
        <button
          type="button"
          className={tab === "documentation"
            ? "px-8 py-3 text-sm font-semibold text-primary border-b-2 border-primary"
            : "px-8 py-3 text-sm font-medium text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"}
          onClick={() => setTab("documentation")}
        >
          Documentation
        </button>
      </div>

      {/* Spec Details Tab */}
      {tab === "details" && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Form */}
          <div className="col-span-2 space-y-6">
            <Card>
              <CardContent className="p-6 space-y-5">
                {/* Project ID and Title Row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider mb-1.5 block">
                      Project ID
                    </label>
                    <Input
                      placeholder="PF-2024-001"
                      value={taskId}
                      onChange={(e) => setTaskId(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider mb-1.5 block">
                      Project Title
                    </label>
                    <Input
                      placeholder="Enter concise title..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="text-[11px] font-medium text-on-surface-variant uppercase tracking-wider mb-1.5 block">
                    Project Description
                  </label>
                  <Textarea
                    placeholder="Outline the strategic objectives and scope of this spec..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Initial Spec Requirements */}
            <Card>
              <CardHeader>
                <CardTitle>Initial Spec Requirements</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-outline-ghost rounded-lg p-8 text-center hover:border-primary/50 transition-colors cursor-pointer">
                  <Upload className="h-8 w-8 text-on-surface-variant mx-auto mb-3" />
                  <p className="text-sm text-on-surface">
                    Drop spec file here or <span className="text-primary">browse files</span>
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    Accepts PDF, JSON, or RAW text (10MB)
                  </p>
                </div>

                {/* Or Manual Entry */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-outline-ghost" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-surface-container-lowest px-2 text-on-surface-variant">
                      Or enter manual requirements
                    </span>
                  </div>
                </div>

                <Textarea
                  placeholder="Paste technical specifications or raw requirement data here..."
                  value={requirements}
                  onChange={(e) => setRequirements(e.target.value)}
                  rows={6}
                  className="font-mono text-sm"
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Finalize Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Finalize</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={handleSubmit}
                  disabled={submitting || !taskId.trim() || !title.trim()}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="h-4 w-4" />
                  )}
                  Initiate Pipeline
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={() => navigate("/")}
                >
                  Cancel
                </Button>

                {error && (
                  <p className="text-sm text-error text-center">{error}</p>
                )}

                <p className="text-xs text-on-surface-variant text-center pt-2">
                  Initiating will trigger the validation sequence across all available factory nodes.
                </p>
              </CardContent>
            </Card>

            {/* Architect Guidelines */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <CardTitle>Architect Guidelines</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-on-surface-variant">
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Ensure Project IDs follow the PF-YYYY-NNN format for global registry.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Title should not exceed 50 characters to maintain UI integrity across the dashboard.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-primary">•</span>
                    Uploaded requirements are automatically parsed for dependency conflicts.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Status Preview Card */}
            <Card className="bg-surface-container border-0">
              <CardContent className="p-4">
                <p className="text-[10px] text-on-surface-variant uppercase tracking-wider mb-2">
                  System Ready for Injection
                </p>
                <div className="h-20 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg flex items-center justify-center">
                  <span className="text-xs text-primary font-medium">Factory Standby</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Resources Tab */}
      {tab === "resources" && (
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - 2/3 */}
          <div className="col-span-2 space-y-6">
            {/* Linked Resources */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-on-surface uppercase tracking-widest">Linked Resources</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Drop Zone */}
                <div
                  className="border-2 border-dashed border-outline-ghost/30 bg-surface-container-low/50 rounded-lg p-10 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="h-8 w-8 text-on-surface-variant mx-auto mb-3" />
                  <p className="text-sm text-on-surface">
                    Drop files here or <span className="text-primary">browse</span>
                  </p>
                  <p className="text-xs text-on-surface-variant mt-1">
                    PDF, JSON, PNG (Max 10MB per file)
                  </p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleFileSelect}
                    accept=".pdf,.json,.png,.jpg,.svg,.txt"
                  />
                </div>

                {/* File List */}
                <div className="space-y-2">
                  {files.length === 0 ? (
                    <p className="text-sm text-on-surface-variant text-center py-4">No files attached yet</p>
                  ) : (
                    files.map((file, i) => {
                      const Icon = file.icon;
                      return (
                        <div key={`${file.name}-${i}`} className="p-4 bg-surface-container-low rounded flex items-center gap-3">
                          <Icon className="h-4 w-4 text-on-surface-variant shrink-0" />
                          <span className="text-sm text-on-surface flex-1">{file.name}</span>
                          <span className="text-xs text-on-surface-variant">{file.size}</span>
                          <button
                            className="text-on-surface-variant hover:text-on-surface transition-colors"
                            onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* External Links */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-bold text-on-surface uppercase tracking-widest">External Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-3">
                  <Input
                    placeholder="https://..."
                    className="flex-1"
                    value={newLinkUrl}
                    onChange={(e) => setNewLinkUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddLink(); }}
                  />
                  <Button onClick={handleAddLink} disabled={!newLinkUrl.trim()}>Add Link</Button>
                </div>
                <div className="space-y-2">
                  {links.length === 0 ? (
                    <p className="text-sm text-on-surface-variant text-center py-4">No links added yet</p>
                  ) : (
                    links.map((link, i) => (
                      <div key={`${link.url}-${i}`} className="p-4 bg-surface-container-low rounded flex items-center gap-3">
                        <Globe className="h-4 w-4 text-on-surface-variant shrink-0" />
                        <span className="text-sm text-primary flex-1 truncate">{link.url}</span>
                        <button
                          className="text-on-surface-variant hover:text-on-surface transition-colors"
                          onClick={() => setLinks(prev => prev.filter((_, j) => j !== i))}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - 1/3 */}
          <div className="space-y-4">
            {/* Resource Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resource Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-4 bg-surface-container-low rounded text-center">
                  <p className="text-lg font-semibold text-on-surface">{files.length} {files.length === 1 ? "File" : "Files"}, {links.length} {links.length === 1 ? "Link" : "Links"}</p>
                </div>
                <div className="p-4 bg-surface-container-low rounded text-center">
                  <p className="text-lg font-semibold text-on-surface">
                    {files.length === 0 && links.length === 0 ? "No resources" : `${files.length + links.length} total`}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Architect Guidelines */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Info className="h-4 w-4 text-primary" />
                  <CardTitle>Architect Guidelines</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-xs text-on-surface-variant">
                  <li className="flex gap-2">
                    <span className="text-teal-400">•</span>
                    Linked resources are validated against the spec schema before injection.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal-400">•</span>
                    External links are crawled for metadata extraction during pipeline init.
                  </li>
                  <li className="flex gap-2">
                    <span className="text-teal-400">•</span>
                    Maximum of 20 resources per spec to maintain processing efficiency.
                  </li>
                </ul>
              </CardContent>
            </Card>

            {/* Navigation Buttons */}
            <div className="space-y-3">
              <Button
                className="w-full"
                onClick={() => setTab("documentation")}
              >
                Next: Documentation
              </Button>
              <Button
                variant="secondary"
                className="w-full"
                onClick={() => setTab("details")}
              >
                Back: Spec Details
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Documentation Tab */}
      {tab === "documentation" && (
        <div className="grid grid-cols-12 gap-6">
          {/* Left Column - col-span-8 */}
          <div className="col-span-8 space-y-6">
            {/* Technical Documentation */}
            <Card>
              <CardHeader>
                <CardTitle>Technical Documentation</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Toolbar */}
                <div className="flex gap-1 border-b border-outline-ghost/15 pb-3">
                  <button className="p-2 rounded hover:bg-surface-container-low transition-colors text-on-surface-variant hover:text-on-surface">
                    <Bold className="h-4 w-4" />
                  </button>
                  <button className="p-2 rounded hover:bg-surface-container-low transition-colors text-on-surface-variant hover:text-on-surface">
                    <Italic className="h-4 w-4" />
                  </button>
                  <button className="p-2 rounded hover:bg-surface-container-low transition-colors text-on-surface-variant hover:text-on-surface">
                    <Code className="h-4 w-4" />
                  </button>
                  <button className="p-2 rounded hover:bg-surface-container-low transition-colors text-on-surface-variant hover:text-on-surface">
                    <Heading className="h-4 w-4" />
                  </button>
                  <button className="p-2 rounded hover:bg-surface-container-low transition-colors text-on-surface-variant hover:text-on-surface">
                    <List className="h-4 w-4" />
                  </button>
                  <button className="p-2 rounded hover:bg-surface-container-low transition-colors text-on-surface-variant hover:text-on-surface">
                    <Link className="h-4 w-4" />
                  </button>
                </div>

                {/* Editor */}
                <Textarea
                  className="h-80 font-mono text-sm"
                  placeholder="Enter technical documentation, architectural notes, API contracts..."
                  value={docContent}
                  onChange={(e) => setDocContent(e.target.value)}
                />
              </CardContent>
            </Card>

            {/* Acceptance Criteria */}
            <Card>
              <CardHeader>
                <CardTitle>Acceptance Criteria</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {criteria.length === 0 && !showCriterionInput && (
                  <p className="text-sm text-on-surface-variant text-center py-4">No acceptance criteria defined yet</p>
                )}
                {criteria.map((c, i) => (
                  <div key={i} className="p-4 rounded bg-surface-container-low flex items-center gap-3">
                    <button
                      className={`h-5 w-5 rounded border shrink-0 flex items-center justify-center ${
                        c.checked
                          ? "border-primary bg-primary/20"
                          : "border-outline-ghost"
                      }`}
                      onClick={() => toggleCriterion(i)}
                    >
                      {c.checked && <Check className="h-3 w-3 text-primary" />}
                    </button>
                    <span className="text-sm text-on-surface flex-1">{c.text}</span>
                    <button
                      className="text-on-surface-variant hover:text-on-surface transition-colors"
                      onClick={() => setCriteria(prev => prev.filter((_, j) => j !== i))}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
                {showCriterionInput ? (
                  <div className="flex gap-3 items-center">
                    <Input
                      placeholder="Enter acceptance criterion..."
                      value={newCriterion}
                      onChange={(e) => setNewCriterion(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") handleAddCriterion(); }}
                      className="flex-1"
                      autoFocus
                    />
                    <Button size="sm" onClick={handleAddCriterion} disabled={!newCriterion.trim()}>Add</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowCriterionInput(false); setNewCriterion(""); }}>Cancel</Button>
                  </div>
                ) : (
                  <button
                    className="flex items-center gap-2 text-sm text-primary hover:text-primary/80 transition-colors mt-2 px-1"
                    onClick={() => setShowCriterionInput(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Add Criterion
                  </button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - col-span-4 */}
          <div className="col-span-4 space-y-4">
            {/* Spec Completeness */}
            <Card>
              <CardHeader>
                <CardTitle>Spec Completeness</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Circular Progress */}
                <div className="flex justify-center">
                  <div className="relative">
                    <svg width="160" height="160" viewBox="0 0 160 160">
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke="currentColor"
                        className="text-surface-container-low"
                        strokeWidth="8"
                      />
                      <circle
                        cx="80"
                        cy="80"
                        r="70"
                        fill="none"
                        stroke="currentColor"
                        className="text-primary"
                        strokeWidth="8"
                        strokeLinecap="round"
                        strokeDasharray="439.8"
                        strokeDashoffset={439.8 - (439.8 * completenessPercent / 100)}
                        transform="rotate(-90 80 80)"
                      />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-2xl font-bold text-on-surface">{completenessPercent}%</span>
                      <span className="text-xs text-on-surface-variant">Valid</span>
                    </div>
                  </div>
                </div>

                {/* Status Rows */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Spec Details</span>
                    {specDetailsComplete
                      ? <Check className="h-4 w-4 text-primary" />
                      : <Wrench className="h-4 w-4 text-amber-400" />
                    }
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Resources</span>
                    {resourcesComplete
                      ? <Check className="h-4 w-4 text-primary" />
                      : <Wrench className="h-4 w-4 text-amber-400" />
                    }
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-on-surface-variant">Documentation</span>
                    {documentationComplete
                      ? <Check className="h-4 w-4 text-primary" />
                      : <Wrench className="h-4 w-4 text-amber-400" />
                    }
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Finalize */}
            <Card>
              <CardHeader>
                <CardTitle>Finalize</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => handleSubmit()}
                  disabled={submitting || !taskId.trim() || !title.trim()}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Rocket className="h-4 w-4" />
                  )}
                  Initiate Pipeline
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                >
                  Save Draft
                </Button>
                <Button
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate("/")}
                >
                  Cancel
                </Button>

                {error && (
                  <p className="text-sm text-error text-center">{error}</p>
                )}

                <p className="text-xs text-on-surface-variant text-center pt-2">
                  Initiating will trigger the validation sequence across all available factory nodes.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

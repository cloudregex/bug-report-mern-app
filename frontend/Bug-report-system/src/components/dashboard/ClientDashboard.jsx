import React, { useState, useEffect } from 'react';
import { AlertCircle, Plus, X, Image as ImageIcon, ExternalLink, Calendar, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { Input, Textarea, Select } from '../ui/Input';
import ErrorBanner from '../ui/ErrorBanner';
import EmptyState from '../ui/EmptyState';
import { PageLoader } from '../ui/Spinner';
import { API_BASE_URL, BASE_URL } from '../../config';
import {
  validateTicketTitle,
  validateTicketDescription,
  validateImageFile
} from '../../utils/validation';

export default function ClientDashboard() {
  const [issues, setIssues] = useState([]);
  const [projects, setProjects] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Create issue modal state
  const [showModal, setShowModal] = useState(false);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [errors, setErrors] = useState({});

  const navigate = useNavigate();

  const loadData = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      // 1. Fetch Client Issues
      const issuesRes = await fetch(`${API_BASE_URL}/client-issues`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const issuesData = await issuesRes.json();
      if (!issuesRes.ok) throw new Error(issuesData.message || 'Failed to load issues');
      setIssues(issuesData.clientIssues || []);

      // 2. Fetch Projects Client belongs to
      const projectsRes = await fetch(`${API_BASE_URL}/projects/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const projectsData = await projectsRes.json();
      if (!projectsRes.ok) throw new Error(projectsData.message || 'Failed to load projects');
      setProjects(projectsData.projects || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const check = validateImageFile(file);
      if (!check.valid) {
        setErrors((prev) => ({ ...prev, image: check.message }));
        setImage(null);
        setImagePreview('');
        return;
      }
      setErrors((prev) => ({ ...prev, image: undefined }));
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImage(null);
      setImagePreview('');
    }
  };

  const handleSubmitIssue = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const newErrors = {};

    if (!projectId) {
      newErrors.projectId = 'Please select a project.';
    }

    const titleCheck = validateTicketTitle(title);
    if (!titleCheck.valid) {
      newErrors.title = titleCheck.message;
    }

    const descCheck = validateTicketDescription(description);
    if (!descCheck.valid) {
      newErrors.description = descCheck.message;
    }

    if (image) {
      const imgCheck = validateImageFile(image);
      if (!imgCheck.valid) {
        newErrors.image = imgCheck.message;
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      setSubmitError('Please address the errors below.');
      return;
    }

    setErrors({});
    setIsSubmitting(true);

    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('title', title.trim());
    formData.append('description', description ? description.trim() : '');
    if (image) {
      formData.append('image', image);
    }

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/client-issues`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to submit issue');
      
      // Reset form
      setProjectId('');
      setTitle('');
      setDescription('');
      setImage(null);
      setImagePreview('');
      setErrors({});
      setShowModal(false);

      // Refresh list
      loadData();
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">Pending Review</span>;
      case 'CONVERTED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">Ticket Created</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-rose-100 text-rose-800">Rejected</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  if (isLoading) return <PageLoader />;

  return (
    <div className="space-y-6">
      <ErrorBanner>{error}</ErrorBanner>

      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h3 className="font-extrabold text-lg">My Reported Issues</h3>
          <p className="text-xs text-muted-foreground">Submit feedback or bug reports directly to your project team</p>
        </div>
        <Button
          variant="primary"
          size="auto"
          icon={Plus}
          onClick={() => {
            setSubmitError('');
            setShowModal(true);
          }}
          disabled={projects.length === 0}
          title={projects.length === 0 ? "You must be added to a project first" : "Report new issue"}
        >
          Report Issue
        </Button>
      </div>

      {issues.length === 0 ? (
        <EmptyState
          icon={AlertCircle}
          title="No issues reported yet"
          description="Everything looks good! If you find any bug or have requests, report them here."
          actionLabel={projects.length > 0 ? "+ Report First Issue" : null}
          onAction={() => setShowModal(true)}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {issues.map((issue) => (
            <Card key={issue._id} className="p-6 space-y-4 hover:shadow-md transition-all">
              <div className="flex justify-between items-start flex-wrap gap-2 border-b pb-3">
                <div>
                  <h4 className="font-extrabold text-base text-foreground leading-snug">{issue.title}</h4>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
                    <span className="font-bold text-primary">{issue.project?.name}</span>
                    <span className="flex items-center gap-1 font-mono">
                      <Calendar size={12} />
                      {new Date(issue.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  {getStatusBadge(issue.status)}
                </div>
              </div>

              <div className="flex flex-col md:flex-row gap-4">
                {issue.imageUrl && (
                  <div className="w-full md:w-48 shrink-0">
                    <a
                      href={`${BASE_URL}${issue.imageUrl}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block relative rounded-lg overflow-hidden border bg-muted"
                    >
                      <img
                        src={`${BASE_URL}${issue.imageUrl}`}
                        alt="Issue Screenshot"
                        className="w-full h-32 object-cover group-hover:scale-105 transition-all"
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all text-white text-xs font-semibold gap-1">
                        View Image <ExternalLink size={12} />
                      </div>
                    </a>
                  </div>
                )}
                <div className="flex-1 space-y-3">
                  <p className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">
                    {issue.description || <span className="text-muted-foreground italic">No description provided.</span>}
                  </p>

                  {issue.status === 'CONVERTED' && issue.convertedTicket && (
                    <div className="flex items-center gap-2 mt-4 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs w-fit">
                      <CheckCircle size={14} className="shrink-0 text-emerald-600" />
                      <div>
                        <span>Converted to Ticket: </span>
                        <button
                          type="button"
                          onClick={() => navigate(`/tickets/${issue.convertedTicket._id || issue.convertedTicketId}`)}
                          className="font-bold underline cursor-pointer text-emerald-700 hover:text-emerald-900"
                        >
                          {issue.convertedTicket.ticketNumber}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Report Issue Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="bg-background w-full max-w-lg rounded-xl shadow-2xl border overflow-hidden animate-scale-in">
            <div className="flex justify-between items-center px-6 py-4 border-b">
              <h3 className="font-extrabold text-base">Report An Issue</h3>
              <button
                type="button"
                onClick={() => {
                  setImage(null);
                  setImagePreview('');
                  setShowModal(false);
                }}
                className="text-muted-foreground hover:text-foreground transition-all cursor-pointer p-1"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitIssue} className="p-6 space-y-4" noValidate>
              <ErrorBanner>{submitError}</ErrorBanner>

              <Select
                id="issue-project"
                name="projectId"
                label="Select Project"
                value={projectId}
                error={errors.projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  if (errors.projectId) setErrors((prev) => ({ ...prev, projectId: undefined }));
                }}
                disabled={isSubmitting}
                required
              >
                <option value="">Choose Project</option>
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>{p.name}</option>
                ))}
              </Select>

              <Input
                id="issue-title"
                name="title"
                label="Issue Title"
                type="text"
                required
                maxLength={150}
                placeholder="e.g. Navigation bar overflows on small screens"
                value={title}
                error={errors.title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                }}
                disabled={isSubmitting}
              />

              <Textarea
                id="issue-description"
                name="description"
                label="Describe the issue"
                optional
                maxLength={5000}
                placeholder="Provide steps to reproduce or details about the issue..."
                value={description}
                error={errors.description}
                onChange={(e) => {
                  setDescription(e.target.value);
                  if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
                }}
                disabled={isSubmitting}
                rows={4}
              />

              <div>
                <label htmlFor="issue-image-upload" className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Attach Screenshot / Image (Optional)
                </label>
                <div className={`mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-lg ${errors.image ? 'border-destructive/60 bg-destructive/5' : 'border-muted-foreground/35 hover:border-primary/50'} transition-all relative`}>
                  <div className="space-y-1 text-center">
                    {imagePreview ? (
                      <div className="relative inline-block">
                        <img src={imagePreview} alt="Preview" className="mx-auto h-32 object-contain rounded" />
                        <button
                          type="button"
                          onClick={() => {
                            setImage(null);
                            setImagePreview('');
                            setErrors((prev) => ({ ...prev, image: undefined }));
                          }}
                          className="absolute -top-2 -right-2 bg-destructive text-white p-1 rounded-full shadow hover:bg-destructive-hover cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <ImageIcon className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <div className="flex text-sm justify-center">
                          <label htmlFor="issue-image-upload" className="relative cursor-pointer bg-transparent rounded-md font-semibold text-primary hover:text-primary-hover focus-within:outline-none">
                            <span>Upload a file</span>
                            <input
                              id="issue-image-upload"
                              name="image"
                              type="file"
                              className="sr-only"
                              accept="image/jpeg,image/png,image/webp,image/gif"
                              onChange={handleImageChange}
                              disabled={isSubmitting}
                            />
                          </label>
                        </div>
                        <p className="text-xs text-muted-foreground">PNG, JPG, WebP, GIF up to 10MB</p>
                      </>
                    )}
                  </div>
                </div>
                {errors.image && (
                  <span className="field-error" role="alert">
                    {errors.image}
                  </span>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t mt-6">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setImage(null);
                    setImagePreview('');
                    setErrors({});
                    setShowModal(false);
                  }}
                  disabled={isSubmitting}
                  className="!flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={isSubmitting}
                  loading={isSubmitting}
                  className="!flex-1"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Issue'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

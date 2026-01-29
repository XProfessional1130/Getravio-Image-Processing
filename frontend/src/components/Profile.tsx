import React, { useEffect, useState } from 'react';
import { authAPI, ProfileUpdateData } from '../services/api';
import './Profile.css';

const Profile: React.FC = () => {
  const [profile, setProfile] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');

  const [formData, setFormData] = useState<ProfileUpdateData>({
    first_name: '',
    last_name: '',
    age: undefined,
    gender: undefined,
    phone: '',
    bio: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    try {
      setLoading(true);
      const data = await authAPI.getProfile();
      setProfile(data);
      setFormData({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        age: data.profile?.age,
        gender: data.profile?.gender,
        phone: data.profile?.phone || '',
        bio: data.profile?.bio || '',
      });
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const updated = await authAPI.updateProfile(formData);

      // Update profile state
      setProfile(updated);

      // Update form data to match the saved values
      setFormData({
        first_name: updated.first_name || '',
        last_name: updated.last_name || '',
        age: updated.profile?.age,
        gender: updated.profile?.gender,
        phone: updated.profile?.phone || '',
        bio: updated.profile?.bio || '',
      });

      setSuccess('Profile updated successfully!');
      setEditing(false);

      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updated));

      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditing(false);
    setError('');
    setSuccess('');
    // Reset form to original values
    if (profile) {
      setFormData({
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        age: profile.profile?.age,
        gender: profile.profile?.gender,
        phone: profile.profile?.phone || '',
        bio: profile.profile?.bio || '',
      });
    }
  };

  const getInitials = () => {
    const firstName = profile?.first_name || profile?.username?.charAt(0) || 'U';
    const lastName = profile?.last_name?.charAt(0) || '';
    return `${firstName.charAt(0)}${lastName}`.toUpperCase();
  };

  const getGenderDisplay = (gender?: string) => {
    if (!gender) return 'Not specified';
    return gender.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  if (loading) {
    return (
      <div className="profile-loading">
        <div className="spinner"></div>
        <p>Loading profile...</p>
      </div>
    );
  }

  return (
    <div className="profile-page">
      {/* Notifications */}
      {error && (
        <div className="notification error-notification">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      {success && (
        <div className="notification success-notification">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {success}
        </div>
      )}

      {/* Profile Header Card */}
      <div className="profile-header-card">
        <div className="profile-avatar-section">
          <div className="avatar-circle">
            {getInitials()}
          </div>
          <div className="header-info">
            <h1 className="profile-name">
              {profile?.first_name || profile?.last_name
                ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                : profile?.username}
            </h1>
            <p className="profile-email">{profile?.email}</p>
            <p className="profile-username">@{profile?.username}</p>
          </div>
        </div>

        {!editing && (
          <button className="edit-profile-btn" onClick={() => setEditing(true)}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            Edit Profile
          </button>
        )}
      </div>

      {editing ? (
        /* Edit Mode */
        <div className="profile-edit-section">
          <div className="section-header">
            <h2>Edit Personal Information</h2>
            <p>Update your profile details</p>
          </div>

          <form className="profile-edit-form" onSubmit={handleSubmit}>
            <div className="form-grid">
              {/* First Name */}
              <div className="form-field">
                <label htmlFor="first_name">
                  <svg className="field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  First Name
                </label>
                <input
                  type="text"
                  id="first_name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  placeholder="Enter your first name"
                />
              </div>

              {/* Last Name */}
              <div className="form-field">
                <label htmlFor="last_name">
                  <svg className="field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Last Name
                </label>
                <input
                  type="text"
                  id="last_name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  placeholder="Enter your last name"
                />
              </div>

              {/* Age */}
              <div className="form-field">
                <label htmlFor="age">
                  <svg className="field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Age
                </label>
                <input
                  type="number"
                  id="age"
                  value={formData.age || ''}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value ? Number(e.target.value) : undefined })}
                  placeholder="Enter your age"
                  min="1"
                  max="150"
                />
              </div>

              {/* Gender */}
              <div className="form-field">
                <label htmlFor="gender">
                  <svg className="field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  Gender
                </label>
                <select
                  id="gender"
                  value={formData.gender || ''}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                >
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                </select>
              </div>

              {/* Phone */}
              <div className="form-field full-width">
                <label htmlFor="phone">
                  <svg className="field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  Phone Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="Enter your phone number"
                />
              </div>

              {/* Bio */}
              <div className="form-field full-width">
                <label htmlFor="bio">
                  <svg className="field-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
                  </svg>
                  Bio
                </label>
                <textarea
                  id="bio"
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  placeholder="Tell us about yourself..."
                  rows={4}
                />
              </div>
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-save" disabled={saving}>
                {saving ? (
                  <>
                    <div className="btn-spinner"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save Changes
                  </>
                )}
              </button>
              <button type="button" className="btn-cancel" onClick={handleCancel} disabled={saving}>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                Cancel
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* View Mode */
        <div className="profile-view-section">
          {/* Personal Info Card */}
          <div className="info-card">
            <div className="card-header">
              <svg className="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <h3>Personal Information</h3>
            </div>
            <div className="card-content">
              <div className="info-row">
                <div className="info-label">Full Name</div>
                <div className="info-value">
                  {profile?.first_name || profile?.last_name
                    ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim()
                    : 'Not set'}
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">Age</div>
                <div className="info-value">{profile?.profile?.age || 'Not set'}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Gender</div>
                <div className="info-value">{getGenderDisplay(profile?.profile?.gender)}</div>
              </div>
            </div>
          </div>

          {/* Contact Info Card */}
          <div className="info-card">
            <div className="card-header">
              <svg className="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              <h3>Contact Information</h3>
            </div>
            <div className="card-content">
              <div className="info-row">
                <div className="info-label">Email</div>
                <div className="info-value">{profile?.email}</div>
              </div>
              <div className="info-row">
                <div className="info-label">Phone</div>
                <div className="info-value">{profile?.profile?.phone || 'Not set'}</div>
              </div>
            </div>
          </div>

          {/* Bio Card */}
          <div className="info-card full-width">
            <div className="card-header">
              <svg className="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <h3>About Me</h3>
            </div>
            <div className="card-content">
              <p className="bio-text">{profile?.profile?.bio || 'No bio provided yet.'}</p>
            </div>
          </div>

          {/* Account Details Card */}
          <div className="info-card full-width">
            <div className="card-header">
              <svg className="header-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3>Account Details</h3>
            </div>
            <div className="card-content">
              <div className="info-row">
                <div className="info-label">Member Since</div>
                <div className="info-value">
                  {profile?.profile?.created_at
                    ? new Date(profile.profile.created_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'N/A'}
                </div>
              </div>
              <div className="info-row">
                <div className="info-label">Last Updated</div>
                <div className="info-value">
                  {profile?.profile?.updated_at
                    ? new Date(profile.profile.updated_at).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })
                    : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

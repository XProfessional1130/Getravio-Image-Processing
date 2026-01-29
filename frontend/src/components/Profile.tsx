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
      setProfile(updated);
      setSuccess('Profile updated successfully!');
      setEditing(false);

      // Update localStorage
      localStorage.setItem('user', JSON.stringify(updated));
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

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>My Profile</h1>
        {!editing && (
          <button className="edit-button" onClick={() => setEditing(true)}>
            Edit Profile
          </button>
        )}
      </div>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      {editing ? (
        <form className="profile-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="first_name">First Name</label>
              <input
                type="text"
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                placeholder="Enter first name"
              />
            </div>

            <div className="form-group">
              <label htmlFor="last_name">Last Name</label>
              <input
                type="text"
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                placeholder="Enter last name"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="age">Age</label>
              <input
                type="number"
                id="age"
                value={formData.age || ''}
                onChange={(e) => setFormData({ ...formData, age: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="Enter age"
                min="1"
                max="150"
              />
            </div>

            <div className="form-group">
              <label htmlFor="gender">Gender</label>
              <select
                id="gender"
                value={formData.gender || ''}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">Prefer not to say</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="phone">Phone</label>
            <input
              type="tel"
              id="phone"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Enter phone number"
            />
          </div>

          <div className="form-group">
            <label htmlFor="bio">Bio</label>
            <textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about yourself..."
              rows={4}
            />
          </div>

          <div className="form-actions">
            <button type="submit" className="save-button" disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" className="cancel-button" onClick={handleCancel} disabled={saving}>
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="profile-view">
          <div className="profile-section">
            <h2>Personal Information</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Username</label>
                <p>{profile?.username}</p>
              </div>
              <div className="info-item">
                <label>Email</label>
                <p>{profile?.email}</p>
              </div>
              <div className="info-item">
                <label>First Name</label>
                <p>{profile?.first_name || 'Not set'}</p>
              </div>
              <div className="info-item">
                <label>Last Name</label>
                <p>{profile?.last_name || 'Not set'}</p>
              </div>
              <div className="info-item">
                <label>Age</label>
                <p>{profile?.profile?.age || 'Not set'}</p>
              </div>
              <div className="info-item">
                <label>Gender</label>
                <p>{profile?.profile?.gender ? profile.profile.gender.replace('_', ' ') : 'Not set'}</p>
              </div>
              <div className="info-item">
                <label>Phone</label>
                <p>{profile?.profile?.phone || 'Not set'}</p>
              </div>
              <div className="info-item full-width">
                <label>Bio</label>
                <p>{profile?.profile?.bio || 'No bio provided'}</p>
              </div>
            </div>
          </div>

          <div className="profile-section">
            <h2>Account Details</h2>
            <div className="info-grid">
              <div className="info-item">
                <label>Member Since</label>
                <p>{profile?.profile?.created_at ? new Date(profile.profile.created_at).toLocaleDateString() : 'N/A'}</p>
              </div>
              <div className="info-item">
                <label>Last Updated</label>
                <p>{profile?.profile?.updated_at ? new Date(profile.profile.updated_at).toLocaleDateString() : 'N/A'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;

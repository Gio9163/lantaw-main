import { useState } from "react";
import { useAuth } from "../../../context/AuthContext";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../../../components/common/card";
import { Button } from "../../../components/common/button";
import { Badge } from "../../../components/common/badge";
import {
  User,
  Mail,
  Calendar,
  Clock,
  Pencil,
  Key,
  Circle,
} from "lucide-react";
import { formatDate, formatDateTime } from "../../../utils/formatHelpers";
import EditProfileModal from "./EditProfileModal";
import ChangePasswordModal from "./ChangePasswordModal";
import api from "../../../api/client";

const ProfileLayout = () => {
  const { user, loading } = useAuth();
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);

  // Get user initials for avatar
  const getInitials = () => {
    if (!user) return "U";
    const first = user.first_name?.[0]?.toUpperCase() || "";
    const last = user.last_name?.[0]?.toUpperCase() || "";
    return `${first}${last}` || "U";
  };

  // Get role display name
  const getRoleDisplayName = () => {
    if (!user) return "";
    return user.role || "Project Staff";
  };

  // Get role badge color
  const getRoleBadgeColor = () => {
    if (!user) return "default";
    if (user.role === "Admin") {
      return "destructive";
    }
    return "secondary";
  };

  // Handle edit profile success - refresh user data
  const handleEditProfileSuccess = async () => {
    // The AuthContext will automatically refresh user data on next render
    // But we can trigger a manual refresh if needed
    if (user?.id) {
      try {
        await api.get(`/api/users/${user.id}/`);
        // Update user in context would require exposing a method
        // For now, the page will refresh on next navigation
      } catch (err) {
        console.error("Failed to refresh user data:", err);
      }
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="p-4 sm:p-6">
        <div className="bg-card border border-border rounded-lg p-6">
          <p className="text-muted-foreground">No user data available.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Title and Subtitle */}
      <div className="space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold">Profile Settings</h1>
        <p className="text-sm sm:text-base text-muted-foreground">
          Manage your account information and preferences.
        </p>
      </div>

      {/* User Profile Card */}
      <Card>
        <CardHeader>
          <CardTitle>User Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
            {/* Avatar */}
            <div className="shrink-0">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-teal-500 flex items-center justify-center text-white text-xl sm:text-2xl font-semibold">
                {getInitials()}
              </div>
            </div>

            {/* User Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <h2 className="text-xl sm:text-2xl font-semibold wrap-break-word">
                {user.first_name} {user.last_name}
              </h2>
              
              {/* Role Badge */}
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant={getRoleBadgeColor() as any}
                  className={`flex items-center gap-1.5 shrink-0 ${
                    user.role === "Admin"
                      ? "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400"
                      : ""
                  }`}
                >
                  <Circle className="h-2 w-2 fill-current" />
                  {getRoleDisplayName()}
                </Badge>
              </div>

              {/* Email */}
              <div className="flex items-center gap-2 text-muted-foreground text-sm sm:text-base break-all">
                <Mail className="h-4 w-4 shrink-0" />
                <span>{user.email}</span>
              </div>
            </div>

            {/* Action Buttons - Right Side */}
            <div className="flex flex-nowrap gap-2 sm:gap-3 sm:pt-2 sm:justify-end shrink-0">
              <Button
                variant="outline"
                onClick={() => setIsEditProfileOpen(true)}
                className="flex items-center gap-2 shrink-0"
              >
                <Pencil className="h-4 w-4 shrink-0" />
                Edit Profile
              </Button>
              <Button
                variant="outline"
                onClick={() => setIsChangePasswordOpen(true)}
                className="flex items-center gap-2 shrink-0"
              >
                <Key className="h-4 w-4 shrink-0" />
                Change Password
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Account Information Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Account Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date Joined */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>Date Joined</span>
              </div>
              <p className="font-medium">
                {user.date_joined ? formatDate(user.date_joined) : "N/A"}
              </p>
            </div>

            {/* Last Login */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Last Login</span>
              </div>
              <p className="font-medium">
                {user.last_login
                  ? formatDateTime(user.last_login)
                  : "Never"}
              </p>
            </div>

            {/* Account Status */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Account Status</span>
              </div>
              <div className="flex items-center gap-2">
                <div
                  className={`h-2 w-2 rounded-full ${
                    user.account_status === "ACTIVE"
                      ? "bg-green-500"
                      : user.account_status === "SUSPENDED"
                      ? "bg-yellow-500"
                      : "bg-gray-500"
                  }`}
                />
                <p className="font-medium">
                  {user.account_status === "ACTIVE"
                    ? "Active"
                    : user.account_status === "SUSPENDED"
                    ? "Suspended"
                    : "Deactivated"}
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modals */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        onClose={() => setIsEditProfileOpen(false)}
        onSuccess={handleEditProfileSuccess}
      />
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        onClose={() => setIsChangePasswordOpen(false)}
      />
    </div>
  );
};

export default ProfileLayout;

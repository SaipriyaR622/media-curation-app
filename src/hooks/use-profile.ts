import { useCallback, useEffect, useState } from "react";
import { Profile } from "@/lib/types";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const STORAGE_KEY = "fragments-profile";
const LEGACY_STORAGE_KEY = "cozy-library-profile";
const MIGRATION_FLAG_PREFIX = "fragments-profile-migrated";
const MISSING_FOLLOWS_TABLE_CODE = "42P01";

interface ProfileRow {
  id: string;
  name: string;
  bio: string;
  yearly_goal: number;
  avatar_url: string;
}

interface DirectoryProfileRow {
  id: string;
  name: string;
  bio: string;
  avatar_url: string;
}

interface FollowEdgeRow {
  following_id?: string;
  follower_id?: string;
}

export interface FollowableProfile {
  id: string;
  name: string;
  bio: string;
  avatarUrl: string;
}

const defaultProfile: Profile = {
  name: "Reader",
  bio: "reader, annotator, lover of slow burns",
  yearlyGoal: 24,
  avatarUrl: "",
  followers: 0,
  following: 0,
};

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY);
    return raw ? { ...defaultProfile, ...JSON.parse(raw) } : defaultProfile;
  } catch {
    return defaultProfile;
  }
}

function saveProfile(profile: Profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}

function mapProfileRowToProfile(row: ProfileRow): Profile {
  return {
    name: row.name ?? defaultProfile.name,
    bio: row.bio ?? defaultProfile.bio,
    yearlyGoal: typeof row.yearly_goal === "number" ? row.yearly_goal : defaultProfile.yearlyGoal,
    avatarUrl: row.avatar_url ?? "",
    followers: defaultProfile.followers,
    following: defaultProfile.following,
  };
}

function mapProfileToUpsertRow(profile: Profile, userId: string) {
  return {
    id: userId,
    name: profile.name || defaultProfile.name,
    bio: profile.bio || defaultProfile.bio,
    yearly_goal: typeof profile.yearlyGoal === "number" ? Math.max(profile.yearlyGoal, 0) : defaultProfile.yearlyGoal,
    avatar_url: profile.avatarUrl ?? "",
  };
}

function mapDirectoryProfile(row: DirectoryProfileRow): FollowableProfile {
  return {
    id: row.id,
    name: row.name || defaultProfile.name,
    bio: row.bio || defaultProfile.bio,
    avatarUrl: row.avatar_url ?? "",
  };
}

async function getCurrentUserId() {
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Unable to resolve Supabase user", error.message);
    return null;
  }

  return data.user?.id ?? null;
}

async function upsertProfileRow(profile: Profile, userId: string) {
  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("profiles").upsert(mapProfileToUpsertRow(profile, userId), {
    onConflict: "id",
  });

  if (error) {
    throw error;
  }
}

function isMissingFollowsTableError(error: unknown) {
  const code = (error as { code?: string } | null)?.code;
  const message = (error as { message?: string } | null)?.message ?? "";
  return code === MISSING_FOLLOWS_TABLE_CODE || /profile_follows/i.test(message);
}

async function loadProfilesByIds(ids: string[]) {
  if (!supabase || ids.length === 0) {
    return [] as FollowableProfile[];
  }

  const { data, error } = await supabase.from("profiles").select("id,name,bio,avatar_url").in("id", ids).order("name", {
    ascending: true,
  });

  if (error) {
    throw error;
  }

  return (data ?? []).map((entry) => mapDirectoryProfile(entry as DirectoryProfileRow));
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(loadProfile);
  const [dbUserId, setDbUserId] = useState<string | null>(null);
  const [discoverProfiles, setDiscoverProfiles] = useState<FollowableProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<string[]>([]);
  const [followersProfiles, setFollowersProfiles] = useState<FollowableProfile[]>([]);
  const [followingProfiles, setFollowingProfiles] = useState<FollowableProfile[]>([]);
  const [socialReady, setSocialReady] = useState(!isSupabaseConfigured);
  const [socialError, setSocialError] = useState<string>("");
  const [followsTableAvailable, setFollowsTableAvailable] = useState(true);
  const [userSearchResults, setUserSearchResults] = useState<FollowableProfile[]>([]);
  const [userSearchLoading, setUserSearchLoading] = useState(false);

  const refreshSocialGraph = useCallback(
    async (userId: string) => {
      if (!supabase || !followsTableAvailable) {
        return;
      }

      setSocialError("");

      const [directoryResult, followingResult, followerResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id,name,bio,avatar_url")
          .neq("id", userId)
          .order("name", { ascending: true })
          .limit(200),
        supabase.from("profile_follows").select("following_id").eq("follower_id", userId),
        supabase.from("profile_follows").select("follower_id").eq("following_id", userId),
      ]);

      if (directoryResult.error) {
        throw directoryResult.error;
      }
      if (followingResult.error) {
        throw followingResult.error;
      }
      if (followerResult.error) {
        throw followerResult.error;
      }

      const nextFollowingIds = (followingResult.data ?? [])
        .map((edge) => (edge as FollowEdgeRow).following_id ?? "")
        .filter(Boolean);
      const followerIds = (followerResult.data ?? [])
        .map((edge) => (edge as FollowEdgeRow).follower_id ?? "")
        .filter(Boolean);

      const [nextFollowingProfiles, nextFollowersProfiles] = await Promise.all([
        loadProfilesByIds(nextFollowingIds),
        loadProfilesByIds(followerIds),
      ]);

      const mappedProfiles = (directoryResult.data ?? []).map((entry) => mapDirectoryProfile(entry as DirectoryProfileRow));

      setDiscoverProfiles(mappedProfiles);
      setFollowingIds(nextFollowingIds);
      setFollowingProfiles(nextFollowingProfiles);
      setFollowersProfiles(nextFollowersProfiles);
      setProfile((prev) => ({
        ...prev,
        followers: followerIds.length,
        following: nextFollowingIds.length,
      }));
    },
    [followsTableAvailable]
  );

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      setSocialReady(true);
      return;
    }

    let isActive = true;

    const hydrateUser = async () => {
      const userId = await getCurrentUserId();
      if (isActive) {
        setDbUserId(userId);
      }
    };

    void hydrateUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isActive) {
        setDbUserId(session?.user?.id ?? null);
      }
    });

    return () => {
      isActive = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !dbUserId) {
      setSocialReady(true);
      setFollowersProfiles([]);
      setFollowingProfiles([]);
      setFollowingIds([]);
      setDiscoverProfiles([]);
      return;
    }

    let isActive = true;

    const loadFromDatabase = async () => {
      try {
        const { data, error } = await supabase.from("profiles").select("*").eq("id", dbUserId).maybeSingle();

        if (!isActive) {
          return;
        }

        if (error) {
          throw error;
        }

        if (data) {
          setProfile((prev) => ({
            ...mapProfileRowToProfile(data as ProfileRow),
            followers: prev.followers,
            following: prev.following,
          }));
          localStorage.setItem(`${MIGRATION_FLAG_PREFIX}:${dbUserId}`, "1");
        } else {
          const migrationFlagKey = `${MIGRATION_FLAG_PREFIX}:${dbUserId}`;
          const isMigrated = localStorage.getItem(migrationFlagKey) === "1";
          const localProfile = loadProfile();
          const profileToPersist = isMigrated ? defaultProfile : localProfile;

          await upsertProfileRow(profileToPersist, dbUserId);
          if (!isActive) {
            return;
          }

          setProfile(profileToPersist);
          localStorage.setItem(migrationFlagKey, "1");
        }

        try {
          await refreshSocialGraph(dbUserId);
        } catch (socialLoadError) {
          if (isMissingFollowsTableError(socialLoadError)) {
            setFollowsTableAvailable(false);
            setSocialError("Follow system is not initialized in the database yet.");
          } else {
            const message = (socialLoadError as { message?: string } | null)?.message ?? "Unable to load social graph.";
            setSocialError(message);
          }
        } finally {
          if (isActive) {
            setSocialReady(true);
          }
        }
      } catch (loadError) {
        const message = (loadError as { message?: string } | null)?.message ?? "Unknown profile load error";
        console.error("Failed to load profile from database", message);
        if (isActive) {
          setSocialReady(true);
        }
      }
    };

    setSocialReady(false);
    void loadFromDatabase();

    return () => {
      isActive = false;
    };
  }, [dbUserId, refreshSocialGraph]);

  useEffect(() => {
    saveProfile(profile);
  }, [profile]);

  const updateProfile = useCallback(
    (updates: Partial<Profile>) => {
      const nextProfile = { ...profile, ...updates };
      setProfile(nextProfile);

      if (!supabase || !dbUserId) {
        return;
      }

      void upsertProfileRow(nextProfile, dbUserId).catch((error) => {
        const message = (error as { message?: string } | null)?.message ?? "Unknown profile update error";
        console.error("Failed to update profile", message);
      });
    },
    [dbUserId, profile]
  );

  const toggleFollow = useCallback(
    async (targetUserId: string) => {
      if (!supabase || !dbUserId || !followsTableAvailable) {
        return;
      }

      if (targetUserId === dbUserId) {
        return;
      }

      setSocialError("");

      const currentlyFollowing = followingIds.includes(targetUserId);
      setFollowingIds((prev) => (currentlyFollowing ? prev.filter((entry) => entry !== targetUserId) : [...prev, targetUserId]));
      setProfile((prev) => ({
        ...prev,
        following: currentlyFollowing ? Math.max(0, prev.following - 1) : prev.following + 1,
      }));

      const mutation = currentlyFollowing
        ? supabase.from("profile_follows").delete().eq("follower_id", dbUserId).eq("following_id", targetUserId)
        : supabase.from("profile_follows").insert({
            follower_id: dbUserId,
            following_id: targetUserId,
          });

      const { error } = await mutation;

      if (error) {
        setFollowingIds((prev) => (currentlyFollowing ? [...prev, targetUserId] : prev.filter((entry) => entry !== targetUserId)));
        setProfile((prev) => ({
          ...prev,
          following: currentlyFollowing ? prev.following + 1 : Math.max(0, prev.following - 1),
        }));

        if (isMissingFollowsTableError(error)) {
          setFollowsTableAvailable(false);
          setSocialError("Follow system is not initialized in the database yet.");
          return;
        }

        setSocialError(error.message);
        return;
      }

      await refreshSocialGraph(dbUserId);
    },
    [dbUserId, followsTableAvailable, followingIds, refreshSocialGraph]
  );

  const searchUsers = useCallback(
    async (query: string) => {
      if (!supabase || !dbUserId) {
        setUserSearchLoading(false);
        setUserSearchResults([]);
        return;
      }

      const trimmedQuery = query.trim();
      if (!trimmedQuery) {
        setUserSearchLoading(false);
        setUserSearchResults([]);
        return;
      }

      setUserSearchLoading(true);
      const { data, error } = await supabase
        .from("profiles")
        .select("id,name,bio,avatar_url")
        .neq("id", dbUserId)
        .ilike("name", `%${trimmedQuery}%`)
        .order("name", { ascending: true })
        .limit(20);

      if (error) {
        setUserSearchLoading(false);
        throw error;
      }

      const mapped = (data ?? []).map((entry) => mapDirectoryProfile(entry as DirectoryProfileRow));
      setUserSearchResults(mapped);
      setUserSearchLoading(false);
    },
    [dbUserId]
  );

  return {
    profile,
    updateProfile,
    currentUserId: dbUserId,
    discoverProfiles,
    followingIds,
    followersProfiles,
    followingProfiles,
    socialReady,
    socialError,
    followsTableAvailable,
    userSearchResults,
    userSearchLoading,
    searchUsers,
    toggleFollow,
  };
}

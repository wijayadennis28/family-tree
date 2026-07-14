import React, { createContext, useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';

export const AuthContext = createContext();

function normalizeFamilyRoles(familyRoles = []) {
  return familyRoles.map(r => ({
    familyId: r.family_id,
    familyName: r.family_name,
    role: r.role,
    isPrimary: r.is_primary,
  }));
}

function isFamilyAccessible(family, roles) {
  if (!family) return false;
  const accessibleFamilyIds = roles.map(r => String(r.familyId));
  return accessibleFamilyIds.includes(String(family.id));
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [familyRoles, setFamilyRoles] = useState([]);
  const [primaryFamily, setPrimaryFamily] = useState(null);
  const [activeFamily, setActiveFamily] = useState(null);
  const [activeBranch, setActiveBranch] = useState(null);
  const [abilityMatrix, setAbilityMatrix] = useState({ Admin: [], Editor: [], Member: [], Viewer: [] });

  // Restore session from localStorage on boot
  useEffect(() => {
    const t = localStorage.getItem('ft_token');
    const u = localStorage.getItem('ft_user');
    if (t && u) {
      try {
        const parsed = JSON.parse(u);
        const savedActiveFamilyId = localStorage.getItem('ft_active_family_id');
        const restoredActiveFamilyId = savedActiveFamilyId ? JSON.parse(savedActiveFamilyId) : null;
        const normalizedRoles = normalizeFamilyRoles(parsed.family_roles ?? []);
        const primaryRole = normalizedRoles.find(r => r.isPrimary) ?? normalizedRoles[0] ?? null;
        const reconstructedPrimary = primaryRole
          ? { id: primaryRole.familyId, name: primaryRole.familyName }
          : null;
        const restoredActiveFamily = restoredActiveFamilyId
          ? normalizedRoles.find(r => String(r.familyId) === String(restoredActiveFamilyId))
          : null;
        const isRestoredValid = !!restoredActiveFamily;
        setToken(t);
        setUser(parsed.user ?? parsed);
        setFamilyRoles(normalizedRoles);
        setPrimaryFamily(reconstructedPrimary);
        setActiveFamily(isRestoredValid ? { id: restoredActiveFamily.familyId, name: restoredActiveFamily.familyName } : reconstructedPrimary);
        setAbilityMatrix(parsed.ability_matrix ?? { Admin: [], Editor: [], Member: [], Viewer: [] });
      } catch (_) {
        localStorage.removeItem('ft_token');
        localStorage.removeItem('ft_user');
        localStorage.removeItem('ft_active_family_id');
      }
    }
    setLoading(false);
  }, []);

  // Persist active family id whenever it changes
  useEffect(() => {
    if (activeFamily?.id) {
      localStorage.setItem('ft_active_family_id', JSON.stringify(activeFamily.id));
    }
  }, [activeFamily]);

  const refreshUser = useCallback(async () => {
    if (!token) return;
    try {
      const resp = await apiClient.get('/auth/profile');
      const payload = resp.data;
      const userInfo = payload.user ?? payload;
      const roles = normalizeFamilyRoles(payload.family_roles ?? []);
      const primaryRole = roles.find(r => r.isPrimary) ?? roles[0] ?? null;
      const reconstructedPrimary = primaryRole
        ? { id: primaryRole.familyId, name: primaryRole.familyName }
        : null;
      setUser(userInfo);
      setFamilyRoles(roles);
      setPrimaryFamily(reconstructedPrimary);
      setActiveFamily(prev => (isFamilyAccessible(prev, roles) ? prev : reconstructedPrimary));
      setAbilityMatrix(payload.ability_matrix ?? { Admin: [], Editor: [], Member: [], Viewer: [] });
      localStorage.setItem('ft_user', JSON.stringify({
        user: userInfo,
        family_roles: payload.family_roles ?? [],
        primary_family: payload.primary_family ?? null,
        ability_matrix: payload.ability_matrix ?? { Admin: [], Editor: [], Member: [], Viewer: [] },
      }));
    } catch (_) {}
  }, [token]);

  const login = useCallback((newToken, payload) => {
    const userInfo = payload.user ?? payload;
    const roles = normalizeFamilyRoles(payload.family_roles ?? []);
    const primaryRole = roles.find(r => r.isPrimary) ?? roles[0] ?? null;
    const reconstructedPrimary = primaryRole
      ? { id: primaryRole.familyId, name: primaryRole.familyName }
      : null;

    setToken(newToken);
    setUser(userInfo);
    setFamilyRoles(roles);
    setPrimaryFamily(reconstructedPrimary);
    setActiveFamily(reconstructedPrimary);
    setActiveBranch(null);
    setAbilityMatrix(payload.ability_matrix ?? { Admin: [], Editor: [], Member: [], Viewer: [] });

    localStorage.setItem('ft_token', newToken);
    localStorage.setItem('ft_user', JSON.stringify({
      user: userInfo,
      family_roles: payload.family_roles ?? [],
      primary_family: payload.primary_family ?? null,
      ability_matrix: payload.ability_matrix ?? { Admin: [], Editor: [], Member: [], Viewer: [] },
    }));
    localStorage.setItem('ft_active_family_id', JSON.stringify(reconstructedPrimary?.id ?? null));
  }, []);

  const logout = useCallback(async (currentToken) => {
    try {
      const t = currentToken || token;
      if (t) {
        await apiClient.post('/auth/logout', {});
      }
    } catch (_) {}
    setToken(null);
    setUser(null);
    setFamilyRoles([]);
    setPrimaryFamily(null);
    setActiveFamily(null);
    setActiveBranch(null);
    setAbilityMatrix({ Admin: [], Editor: [], Member: [], Viewer: [] });
    localStorage.removeItem('ft_token');
    localStorage.removeItem('ft_user');
    localStorage.removeItem('ft_active_family_id');
  }, [token]);

  const hasFamilyRole = useCallback((familyId, roles) => {
    if (!familyId) return false;
    if (user?.role === 'Super Admin') return true;

    const required = Array.isArray(roles) ? roles : [roles];
    const access = familyRoles.find(r => String(r.familyId) === String(familyId));
    return access ? required.includes(access.role) : false;
  }, [familyRoles, user]);

  const canEditTree = useCallback((familyId) => {
    if (user?.role === 'Super Admin') return true;
    return hasFamilyRole(familyId, ['Admin', 'Editor']);
  }, [hasFamilyRole, user]);

  const canAdminFamily = useCallback((familyId) => {
    if (user?.role === 'Super Admin') return true;
    return hasFamilyRole(familyId, ['Admin']);
  }, [hasFamilyRole, user]);

  const isAdmin = useCallback(() => {
    if (user?.role === 'Super Admin') return true;
    return familyRoles.some(r => r.role === 'Admin' || r.role === 'Editor');
  }, [familyRoles, user]);

  const hasAbility = useCallback((ability, familyId = activeFamily?.id ?? primaryFamily?.id) => {
    if (user?.role === 'Super Admin') return true;
    if (!familyId) return false;

    const access = familyRoles.find(r => String(r.familyId) === String(familyId));
    if (!access) return false;

    const abilities = abilityMatrix[access.role] || [];
    return abilities.includes(ability);
  }, [familyRoles, activeFamily, primaryFamily, abilityMatrix, user]);

  return (
    <AuthContext.Provider value={{
      user,
      token,
      familyRoles,
      primaryFamily,
      activeFamily,
      setActiveFamily,
      activeBranch,
      setActiveBranch,
      abilityMatrix,
      login,
      logout,
      loading,
      hasFamilyRole,
      canEditTree,
      canAdminFamily,
      isAdmin,
      hasAbility,
      refreshUser,
    }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

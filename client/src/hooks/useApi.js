import { useContext, useRef, useCallback, useMemo } from 'react';
import { AuthContext } from '../context/AuthContext';
import apiClient from '../api/apiClient';

export function useApi() {
  const { token, logout } = useContext(AuthContext);
  // Use a ref so the instance doesn't change identity on every render
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const logoutRef = useRef(logout);
  logoutRef.current = logout;

  // Request deduplication: cache in-flight GET requests so concurrent
  // calls (e.g. React StrictMode double-invoking effects) share one
  // network request instead of firing two.
  const inflightRef = useRef(new Map());

  const handleAuthError = useCallback(() => {
    if (tokenRef.current) {
      const currentToken = tokenRef.current;
      tokenRef.current = null;
      logoutRef.current?.(currentToken);
    }
    if (window.location.pathname !== '/login') {
      window.location.href = '/login';
    }
  }, []);

  const handleApiError = useCallback((err) => {
    const status = err.response?.status;
    const rawMessage = err.response?.data?.message || err.message;

    // Only redirect to login if the user already had a token (session expired).
    // Failed login attempts also return 401 but should show the error message.
    if ((status === 401 || status === 403) && tokenRef.current) {
      handleAuthError();
      return [null, null];
    }

    return [null, rawMessage];
  }, [handleAuthError]);

  const request = useCallback(async (method, url, payload = null) => {
    const key = payload !== null ? `${method}:${url}:${JSON.stringify(payload)}` : `${method}:${url}`;

    // For idempotent GET/DELETE, reuse any in-flight request
    if ((method === 'get' || method === 'delete') && inflightRef.current.has(key)) {
      return inflightRef.current.get(key);
    }

    const promise = (async () => {
      try {
        const headers = { 'Content-Type': 'application/json' };
        if (tokenRef.current) headers.Authorization = `Bearer ${tokenRef.current}`;
        const config = { headers };
        const resp = payload !== null
          ? await apiClient[method](url, payload, config)
          : await apiClient[method](url, config);
        return [resp.data, null];
      } catch (err) {
        return handleApiError(err);
      } finally {
        inflightRef.current.delete(key);
      }
    })();

    if (method === 'get' || method === 'delete') {
      inflightRef.current.set(key, promise);
    }

    return promise;
  }, [handleApiError]);

  // Multipart/form-data upload — skips Content-Type so axios sets the boundary.
  // PHP does not populate $_FILES for PUT/PATCH, so for those verbs we use
  // Laravel method spoofing: send a real POST with _method in the body.
  const uploadRequest = useCallback(async (url, formData, method = 'post') => {
    try {
      const headers = {};
      if (tokenRef.current) headers.Authorization = `Bearer ${tokenRef.current}`;

      const lowerMethod = method.toLowerCase();
      const needsSpoof = lowerMethod === 'put' || lowerMethod === 'patch';
      let body = formData;
      let actualMethod = lowerMethod;

      if (needsSpoof) {
        body = new FormData();
        for (const [key, value] of formData.entries()) {
          body.append(key, value);
        }
        if (!body.has('_method')) {
          body.append('_method', method.toUpperCase());
        }
        actualMethod = 'post';
      }

      const resp = await apiClient[actualMethod](url, body, { headers });
      return [resp.data, null];
    } catch (err) {
      return handleApiError(err);
    }
  }, [handleApiError]);

  // Memoize so consuming components can safely use `api` in useEffect deps
  return useMemo(() => ({
    get:    (url)        => request('get',    url),
    post:   (url, data)  => request('post',   url, data),
    put:    (url, data)  => request('put',    url, data),
    patch:  (url, data)  => request('patch',  url, data),
    delete: (url)        => request('delete', url),
    upload: (url, formData, method = 'post') => uploadRequest(url, formData, method),
  }), [request, uploadRequest]);
}

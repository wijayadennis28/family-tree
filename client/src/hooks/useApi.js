import axios from 'axios';
import { useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';

export function useApi() {
  const { token } = useContext(AuthContext);
  // Use a ref so the instance doesn't change identity on every render
  const tokenRef = useRef(token);
  tokenRef.current = token;

  const instanceRef = useRef(
    axios.create({ baseURL: process.env.REACT_APP_API_BASE_URL })
  );

  const request = async (method, url, payload = null) => {
    try {
      const headers = { 'Content-Type': 'application/json' };
      if (tokenRef.current) headers.Authorization = `Bearer ${tokenRef.current}`;
      const config = { headers };
      const resp = payload !== null
        ? await instanceRef.current[method](url, payload, config)
        : await instanceRef.current[method](url, config);
      return [resp.data, null];
    } catch (err) {
      return [null, err.response?.data?.message || err.message];
    }
  };

  return {
    get:    (url)        => request('get',    url),
    post:   (url, data)  => request('post',   url, data),
    put:    (url, data)  => request('put',    url, data),
    patch:  (url, data)  => request('patch',  url, data),
    delete: (url)        => request('delete', url),
  };
}

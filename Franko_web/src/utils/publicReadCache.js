import axiosInstance from '../Redux/Slice/AxiosInstance';
import { createReadCache } from './readCache.mjs';

const cache = createReadCache();
const endpoints = new Set([
  '/Product/Product-Get', '/Product/Product-Get-by-Category',
  '/Product/Product-Get-by-Brand', '/Product/Product-Get-by-ShowRoom',
  '/Product/Product-Get-by-ShowRoom_RecordNumber', '/Category/Category-Get',
  '/Brand/Get-Brand', '/ShowRoom/Get-ShowRoom', '/ShowRoom/Get-HomePageShowRoom',
  '/Advertisement/GetAdvertisment',
]);
export function publicReadKey(params = {}) {
  const endpoint = params.endpoint || '';
  if (![...endpoints].some(e => endpoint === e || endpoint.startsWith(e + '/'))) return null;
  return JSON.stringify(Object.entries(params).sort(([a], [b]) => a.localeCompare(b)));
}
export const peekPublicRead = params => {
  const key = publicReadKey(params);
  return key ? cache.peek(key) : undefined;
};
export function publicGet(url, config = {}) {
  const { refresh = false, ...requestConfig } = config;
  const key = publicReadKey(requestConfig.params);
  if (!key) return axiosInstance.get(url, requestConfig);
  return cache.read(key, () => axiosInstance.get(url, requestConfig), { refresh });
}
export const clearPublicReads = () => cache.clear();

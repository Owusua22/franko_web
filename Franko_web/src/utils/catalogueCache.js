import { publicGet } from "./publicReadCache";
export const getCatalogue = ({ forceRefresh = false } = {}) => publicGet("/", { params: { endpoint: "/Product/Product-Get" }, refresh: forceRefresh });

import * as axios from "axios";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3001";
export const api = axios.create({ baseURL: API_BASE });

import axios from 'axios';
import { BACKEND_HOST } from '../config';

const api = axios.create({
  baseURL: BACKEND_HOST,
});

export default api;

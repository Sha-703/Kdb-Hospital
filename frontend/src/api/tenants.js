import axios from 'axios';

export function fetchTenants(){
  return axios.get('/api/tenants/');
}

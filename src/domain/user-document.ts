export interface UserDocument {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
}

export interface SearchUsersQuery {
  q?: string;
  status?: string;
  page: number;
  size: number;
}

export interface SearchUsersResult {
  total: number;
  items: UserDocument[];
}

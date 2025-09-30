export interface CreateUserDto {
  email: string;
  password: string;
  name?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UserSearchResult {
  _id: string;
  email: string;
  name?: string;
  role: 'admin' | 'user';
}


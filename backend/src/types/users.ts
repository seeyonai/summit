export interface CreateUserDto {
  email: string;
  password: string;
  name?: string;
  aliases?: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface UserSearchResult {
  _id: string;
  email: string;
  name?: string;
  aliases?: string;
  role: 'admin' | 'user';
}

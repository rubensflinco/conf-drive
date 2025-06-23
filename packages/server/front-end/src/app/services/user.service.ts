import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { map } from 'rxjs/operators';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  projects: {
    id: string;
    name: string;
    description: string;
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  constructor(private http: HttpClient) {}

  getUsers(): Observable<User[]> {
    return this.http.get<{ success: boolean; users: User[] }>(`${environment.apiUrl}/users`)
      .pipe(map(response => response.users));
  }

  getUser(id: string): Observable<User> {
    return this.http.get<{ success: boolean; user: User }>(`${environment.apiUrl}/users/${id}`)
      .pipe(map(response => response.user));
  }

  createUser(user: { name: string; email: string; password: string; role: 'admin' | 'user'; projects: string[] }): Observable<User> {
    return this.http.post<{ success: boolean; user: User }>(`${environment.apiUrl}/users/register`, user)
      .pipe(map(response => response.user));
  }

  updateUser(id: string, update: { role?: 'admin' | 'user'; projects?: string[] }): Observable<User> {
    return this.http.put<{ success: boolean; user: User }>(`${environment.apiUrl}/users/${id}`, update)
      .pipe(map(response => response.user));
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<{ success: boolean }>(`${environment.apiUrl}/users/${id}`)
      .pipe(map(() => void 0));
  }
} 
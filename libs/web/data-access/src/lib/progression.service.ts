import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_URL } from './api-url.token';

export interface ProgressionRequirement {
  id: string;
  progressionCheckId: string;
  title: string;
  description?: string;
  targetValue?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberRequirementStatus {
  id: string;
  requirementId: string;
  requirement: ProgressionRequirement;
  memberId: string;
  isMet: boolean;
  updatedAt: string;
}

export interface MemberProgressionStatus {
  id: string;
  progressionCheckId: string;
  memberId: string;
  member: any; // includes requirementStatuses if fetched
  isCompleted: boolean;
  completedAt?: string;
  note: string;
  updatedAt: string;
}

export interface ProgressionCheck {
  id: string;
  title: string;
  description: string;
  startDate: string;
  endDate?: string;
  deletedAt?: string;
  createdAt: string;
  updatedAt: string;
  memberStatuses?: MemberProgressionStatus[];
  requirements?: ProgressionRequirement[];
  _count?: {
    memberStatuses: number;
    requirements: number;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ProgressionService {
  private http = inject(HttpClient);
  private baseUrl = inject(API_URL);
  private apiUrl = `${this.baseUrl}/progression`;

  getAllChecks(status: 'active' | 'ended' | 'trash' = 'active'): Observable<ProgressionCheck[]> {
    return this.http.get<ProgressionCheck[]>(`${this.apiUrl}?status=${status}`);
  }

  getSavedTitles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.apiUrl}/titles`);
  }

  getCheckById(id: string): Observable<ProgressionCheck> {
    return this.http.get<ProgressionCheck>(`${this.apiUrl}/${id}`);
  }

  createCheck(data: {
    title: string;
    description?: string;
    startDate?: string;
    endDate?: string;
    requirements?: { title: string; targetValue?: string }[];
  }): Observable<ProgressionCheck> {
    return this.http.post<ProgressionCheck>(this.apiUrl, data);
  }

  restoreCheck(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/restore`, {});
  }

  endCheck(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/end`, {});
  }

  updateMemberStatus(
    statusId: string,
    data: { isCompleted?: boolean; note?: string },
  ): Observable<any> {
    return this.http.patch(`${this.apiUrl}/member-status/${statusId}`, data);
  }

  updateMemberRequirementStatus(statusId: string, isMet: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/requirement-status/${statusId}`, { isMet });
  }

  deleteCheck(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}

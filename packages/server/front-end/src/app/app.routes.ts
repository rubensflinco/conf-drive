import { Routes } from '@angular/router';
import { LoginComponent } from './components/login/login.component';
import { ProjectsComponent } from './components/projects/projects.component';
import { ProjectDetailComponent } from './components/project-detail/project-detail.component';
import { ProjectFormComponent } from './components/project-form/project-form.component';
import { ProjectEditComponent } from './components/project-detail/project-edit/project-edit.component';
import { FolderDetailComponent } from './components/project-detail/folder-detail/folder-detail.component';
import { KeyFormComponent } from './components/project-detail/key-form/key-form.component';
import { SecretsComponent } from './components/secrets/secrets.component';
import { SecretFormComponent } from './components/secret-form/secret-form.component';
import { UsersComponent } from './components/users/users.component';
import { UserFormComponent } from './components/users/user-form/user-form.component';
import { SearchResultsComponent } from './components/search-results/search-results.component';
import { ProjectApiDocsComponent } from './components/shared/api-docs/project-api-docs.component';
import { FolderApiDocsComponent } from './components/shared/api-docs/folder-api-docs.component';
import { authGuard } from './guards/auth.guard';
import { adminGuard } from './guards/admin.guard';

export const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent
  },
  {
    path: 'projects',
    component: ProjectsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'search',
    component: SearchResultsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'projects/new',
    component: ProjectFormComponent,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'projects/:id/folders',
    component: ProjectDetailComponent,
    canActivate: [authGuard]
  },
  {
    path: 'projects/:id/edit',
    component: ProjectEditComponent,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'projects/:projectId/folders/:folderId',
    component: FolderDetailComponent,
    canActivate: [authGuard]
  },
  {
    path: 'projects/:projectId/folders/:folderId/keys/new',
    component: KeyFormComponent,
    canActivate: [authGuard]
  },
  {
    path: 'projects/:projectId/folders/:folderId/keys/:keyId/edit',
    component: KeyFormComponent,
    canActivate: [authGuard]
  },
  {
    path: 'projects/:projectId/secrets',
    component: SecretsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'projects/:projectId/secrets/new',
    component: SecretFormComponent,
    canActivate: [authGuard]
  },
  {
    path: 'projects/:projectId/secrets/:secretId/edit',
    component: SecretFormComponent,
    canActivate: [authGuard]
  },
  {
    path: 'projects/:projectId/api-docs',
    component: ProjectApiDocsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'projects/:projectId/folders/:folderId/api-docs',
    component: FolderApiDocsComponent,
    canActivate: [authGuard]
  },
  {
    path: 'users',
    component: UsersComponent,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'users/new',
    component: UserFormComponent,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'users/:id/edit',
    component: UserFormComponent,
    canActivate: [authGuard, adminGuard]
  },
  {
    path: '',
    redirectTo: '/projects',
    pathMatch: 'full'
  }
];

import { Routes } from "@angular/router";
import { authGuard } from "./core/auth/auth-guard";
import { Login } from "./features/login/login";
import { Projects } from "./features/projects/projects";

export const routes: Routes = [
  {
    path: "login",
    component: Login,
  },
  {
    path: "projects",
    component: Projects,
    canActivate: [authGuard],
  },
  {
    path: "",
    redirectTo: "projects",
    pathMatch: "full",
  },
];
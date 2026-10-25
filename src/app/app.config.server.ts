import { ApplicationConfig, ErrorHandler, mergeApplicationConfig } from '@angular/core';
import { provideServerRendering, withRoutes } from '@angular/ssr';
import { appConfig } from './app.config';
import { serverRoutes } from './app.routes.server';

const serverConfig: ApplicationConfig = {
  providers: [
    provideServerRendering(withRoutes(serverRoutes)),
    // Build errors belong in the build log, never in the production activity database.
    { provide: ErrorHandler, useClass: ErrorHandler },
  ],
};

export const config = mergeApplicationConfig(appConfig, serverConfig);

import { Routes, Route } from 'react-router-dom';
import { ApplicationsListPage } from '../ApplicationsListPage';
import { ApplicationDeploymentPage } from '../ApplicationDeploymentPage';
import { EnvironmentDetailsPage } from '../EnvironmentDetailsPage';

export const Router = () => (
  <Routes>
    <Route path="/" element={<ApplicationsListPage />} />
    <Route path="/:componentName" element={<ApplicationDeploymentPage />} />
    <Route path="/:componentName/:environmentName" element={<EnvironmentDetailsPage />} />
  </Routes>
);
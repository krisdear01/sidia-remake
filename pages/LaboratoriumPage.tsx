import React from 'react';
import { Microscope } from 'lucide-react';
import { AssetCategoryMapPage } from '../components/AssetCategoryMapPage';
import { matchesLab } from '../constants';

export const LaboratoriumPage: React.FC = () => (
  <AssetCategoryMapPage
    title="Laboratorium"
    subtitle="Peta Interaktif Laboratorium Universitas Udayana"
    icon={Microscope}
    roomFilter={matchesLab}
  />
);

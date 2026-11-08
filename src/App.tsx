/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { GameStateProvider, useGameState } from './context/GameStateContext';
import { GameHeader } from './components/layout/GameHeader';
import { SceneNavigationDrawer } from './components/layout/SceneNavigationDrawer';

// 15 Scenes
import { SplashScreen } from './components/scenes/SplashScreen';
import { MainMenuScreen } from './components/scenes/MainMenuScreen';
import { CharacterCreatorScreen } from './components/scenes/CharacterCreatorScreen';
import { VoltTutorialScreen } from './components/scenes/VoltTutorialScreen';
import { MissionMapScreen } from './components/scenes/MissionMapScreen';
import { BasicCircuitLabScreen } from './components/scenes/BasicCircuitLabScreen';
import { SeriesLabScreen } from './components/scenes/SeriesLabScreen';
import { ParallelLabScreen } from './components/scenes/ParallelLabScreen';
import { MixedLabScreen } from './components/scenes/MixedLabScreen';
import { MotorTestScreen } from './components/scenes/MotorTestScreen';
import { BikeGarageScreen } from './components/scenes/BikeGarageScreen';
import { RacePrepScreen } from './components/scenes/RacePrepScreen';
import { RacingScreen } from './components/scenes/RacingScreen';
import { RaceResultsScreen } from './components/scenes/RaceResultsScreen';
import { LearningReflectionScreen } from './components/scenes/LearningReflectionScreen';

const AppContent: React.FC = () => {
  const { state } = useGameState();
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  const renderScene = () => {
    switch (state.currentScene) {
      case 'splash':
        return <SplashScreen />;
      case 'main_menu':
        return <MainMenuScreen />;
      case 'character_creator':
        return <CharacterCreatorScreen />;
      case 'volt_tutorial':
        return <VoltTutorialScreen />;
      case 'mission_map':
        return <MissionMapScreen />;
      case 'basic_circuit_lab':
        return <BasicCircuitLabScreen />;
      case 'series_lab':
        return <SeriesLabScreen />;
      case 'parallel_lab':
        return <ParallelLabScreen />;
      case 'mixed_lab':
        return <MixedLabScreen />;
      case 'motor_test':
        return <MotorTestScreen />;
      case 'bike_garage':
        return <BikeGarageScreen />;
      case 'race_prep':
        return <RacePrepScreen />;
      case 'racing':
        return <RacingScreen />;
      case 'race_results':
        return <RaceResultsScreen />;
      case 'learning_reflection':
        return <LearningReflectionScreen />;
      default:
        return <MainMenuScreen />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none overflow-x-hidden">
      {/* Global Header (hidden on splash) */}
      <GameHeader onOpenSceneDrawer={() => setIsDrawerOpen(true)} />

      {/* Main Active Scene */}
      <main className="flex-1 flex flex-col">{renderScene()}</main>

      {/* 15-Scene Switcher Drawer */}
      <SceneNavigationDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
};

export default function App() {
  return (
    <GameStateProvider>
      <AppContent />
    </GameStateProvider>
  );
}

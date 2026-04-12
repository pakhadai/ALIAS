import React from 'react';
import { PageTransition } from '../components/Shared';
import { GameState } from '../types';
import { useGame } from '../context/GameContext';
import {
  VSScreen,
  PreRoundScreen,
  CountdownScreen,
  PlayingScreen,
  ImposterScreen,
  RoundSummaryScreen,
  ScoreboardScreen,
  GameOverScreen,
} from './GameFlow/screens';
import { GameMode } from '@alias/shared';

/** Single router for all in-game flow states (VS → … → game over). */
export function GameFlow() {
  const { gameState, settings } = useGame();
  const isImposter = settings.mode.gameMode === GameMode.IMPOSTER;

  switch (gameState) {
    case GameState.VS_SCREEN:
      return (
        <PageTransition key="vs">
          <VSScreen />
        </PageTransition>
      );
    case GameState.PRE_ROUND:
      if (isImposter) {
        return (
          <div key="imposter" className="animate-page-in">
            <ImposterScreen />
          </div>
        );
      }
      return (
        <PageTransition key="pre_round">
          <PreRoundScreen />
        </PageTransition>
      );
    case GameState.COUNTDOWN:
      if (isImposter) {
        return (
          <div key="imposter" className="animate-page-in">
            <ImposterScreen />
          </div>
        );
      }
      return (
        <div key="countdown" className="animate-page-in">
          <CountdownScreen />
        </div>
      );
    case GameState.PLAYING:
      if (isImposter) {
        return (
          <div key="imposter" className="animate-page-in">
            <ImposterScreen />
          </div>
        );
      }
      return (
        <div key="playing" className="animate-page-in">
          <PlayingScreen />
        </div>
      );
    case GameState.ROUND_SUMMARY:
      return (
        <PageTransition key="summary">
          <RoundSummaryScreen />
        </PageTransition>
      );
    case GameState.SCOREBOARD:
      return (
        <PageTransition key="scoreboard">
          <ScoreboardScreen />
        </PageTransition>
      );
    case GameState.GAME_OVER:
      return (
        <PageTransition key="gameover">
          <GameOverScreen />
        </PageTransition>
      );
    default:
      return null;
  }
}
export {
  VSScreen,
  PreRoundScreen,
  CountdownScreen,
  PlayingScreen,
  ImposterScreen,
  RoundSummaryScreen,
  ScoreboardScreen,
  GameOverScreen,
} from './GameFlow/screens';

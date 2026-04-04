import React from 'react';
import { PageTransition } from '../components/Shared';
import { GameState } from '../types';
import { useGame } from '../context/GameContext';
import {
  VSScreen,
  PreRoundScreen,
  CountdownScreen,
  PlayingScreen,
  RoundSummaryScreen,
  ScoreboardScreen,
  GameOverScreen,
} from './GameFlow/screens';

/** Single router for all in-game flow states (VS → … → game over). */
export function GameFlow() {
  const { gameState } = useGame();

  switch (gameState) {
    case GameState.VS_SCREEN:
      return (
        <PageTransition key="vs">
          <VSScreen />
        </PageTransition>
      );
    case GameState.PRE_ROUND:
      return (
        <PageTransition key="pre_round">
          <PreRoundScreen />
        </PageTransition>
      );
    case GameState.COUNTDOWN:
      return (
        <div key="countdown" className="animate-page-in">
          <CountdownScreen />
        </div>
      );
    case GameState.PLAYING:
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
  RoundSummaryScreen,
  ScoreboardScreen,
  GameOverScreen,
} from './GameFlow/screens';

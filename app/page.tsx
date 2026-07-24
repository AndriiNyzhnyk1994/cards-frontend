'use client';

import { useState, useEffect } from 'react';
import { socket } from '@/lib/socket';

interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  hand?: string[]; 
  hasPlayed?: boolean; 
}

interface PlayedCard {
  playerId: string;
  text: string;
}

export default function Home() {
  const [roomId, setRoomId] = useState<string>('');
  const [playerName, setPlayerName] = useState<string>(''); // НОВОЕ: состояние для имени
  const [inRoom, setInRoom] = useState<boolean>(false); 
  
  // Состояния комнаты
  const [players, setPlayers] = useState<Player[]>([]);
  const [hostId, setHostId] = useState<string | null>(null);
  const [canStart, setCanStart] = useState<boolean>(false);
  const [gameStatus, setGameStatus] = useState<string>('waiting');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Состояния игры
  const [blackCard, setBlackCard] = useState<string>('');
  const [czarId, setCzarId] = useState<string | null>(null);
  const [playedCardsCount, setPlayedCardsCount] = useState<number>(0); 
  const [playedCards, setPlayedCards] = useState<PlayedCard[]>([]);
  const [winnerId, setWinnerId] = useState<string | null>(null);

// === НОВОЕ СОСТОЯНИЕ ДЛЯ ЭКРАНА РЕЗУЛЬТАТОВ ===
  const [roundResults, setRoundResults] = useState<{
    winnerName: string;
    winningCard: string;
    blackCard: string;
  } | null>(null);

  useEffect(() => {
    socket.on('room_status_update', (data) => {
      setPlayers(data.players);
      setHostId(data.hostId);
      setCanStart(data.canStart);
      setGameStatus(data.status);
      setBlackCard(data.blackCard || ''); 
      setCzarId(data.czarId || null);
      setPlayedCardsCount(data.playedCardsCount || 0); 
      setPlayedCards(data.playedCards || []); 
      setWinnerId(data.winnerId || null); 
      setInRoom(true); 
      setErrorMsg('');

      // Очищаем результаты, когда начинается новый раунд
      if (data.status !== 'showing_results') {
        setRoundResults(null);
      }
    });

    // === НОВОЕ СОБЫТИЕ: ЛОВИМ РЕЗУЛЬТАТЫ РАУНДА ===
    socket.on('round_results', (data) => {
      setRoundResults(data);
      setGameStatus('showing_results'); // Принудительно включаем экран результатов
      if (data.players) setPlayers(data.players); // Сразу обновляем счет игроков слева
    });

    socket.on('error_message', (msg) => {
      setErrorMsg(msg);
    });

    return () => {
      socket.off('room_status_update');
      socket.off('round_results'); // Не забываем отписаться
      socket.off('error_message');
    };
  }, []);

  // НОВОЕ: Отправляем на сервер и комнату, и имя!
  const joinRoom = () => {
    if (roomId.trim() !== '') {
      socket.emit('join_room', { roomId, playerName });
    }
  };

  const startGame = () => {
    socket.emit('start_game', roomId);
  };

  const playCard = (card: string) => {
    socket.emit('play_card', { roomId, card });
  };

  const pickWinner = (winnerId: string) => {
    socket.emit('pick_winner', { roomId, winnerId });
  };

  const restartGame = () => {
    socket.emit('restart_game', roomId);
  };

  const currentPlayer = players.find(p => p.id === socket.id);
  const gameWinner = players.find(p => p.id === winnerId);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8 font-sans">
      
      {/* ЗАГОЛОВОК */}
      <div className="max-w-7xl mx-auto flex flex-col items-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-indigo-400 mb-2 drop-shadow-md">Cards Against Humanity</h1>
        {inRoom && (
          <div className="bg-gray-800/80 px-4 py-1 rounded-full border border-gray-700">
            <p className="text-gray-400 text-sm">Кімната: <span className="font-mono text-white font-bold">{roomId}</span></p>
          </div>
        )}
      </div>

      {/* ЭКРАН 1: ВХОД (Теперь с вводом имени!) */}
      {!inRoom && (
        <div className="max-w-md mx-auto bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700 animate-fade-in">
          <div className="flex flex-col gap-5">
            <div className="text-center mb-2">
              <h2 className="text-xl font-bold text-white">Вхід в лоббі</h2>
              <p className="text-gray-400 text-xs mt-1">Представьтесь і створіть або виберіть кімнату</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">Ваш нікнейм</label>
              <input
                type="text"
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                placeholder="Наприклад: Геральт"
                maxLength={15}
                className="w-full px-4 py-3 bg-gray-900 rounded-xl text-white border border-gray-600 focus:outline-none focus:border-indigo-500 transition-colors font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">ID кімнати</label>
              <input
                type="text"
                value={roomId}
                onChange={(e) => setRoomId(e.target.value)}
                placeholder="Наприклад: room_554"
                className="w-full px-4 py-3 bg-gray-900 rounded-xl text-white border border-gray-600 focus:outline-none focus:border-indigo-500 transition-colors font-mono"
              />
            </div>


            <button
              onClick={joinRoom}
              disabled={roomId.trim() === ''}
              className={`w-full py-4 rounded-xl font-bold transition-all transform mt-2 shadow-lg ${
                roomId.trim() !== ''
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white hover:scale-[1.02] active:scale-95 cursor-pointer shadow-indigo-600/20'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Увійти в гру
            </button>
            {errorMsg && <p className="text-red-400 text-center text-sm font-medium bg-red-900/20 py-2 rounded-lg">{errorMsg}</p>}
          </div>
        </div>
      )}

      {/* ЭКРАН 2: ИГРОВОЙ ИНТЕРФЕЙС */}
      {inRoom && (
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 items-start">
          
          {/* === ЛЕВАЯ КОЛОНКА: САЙДБАР С ИГРОКАМИ === */}
          <div className="w-full lg:w-1/4 bg-gray-800 p-5 rounded-2xl shadow-xl border border-gray-700 shrink-0 sticky top-8">
            <h3 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest border-b border-gray-700 pb-3 flex justify-between items-center">
              <span>Гравці</span>
              <span className="bg-gray-700 text-gray-300 px-2 py-0.5 rounded-full">{players.length}/8</span>
            </h3>
            
            <ul className="flex flex-col gap-3">
              {players.map((p) => (
                <li key={p.id} className={`bg-gray-900/50 p-3 rounded-xl border transition-all ${p.id === czarId && gameStatus !== 'game_over' ? 'border-yellow-500 shadow-[0_0_15px_rgba(234,179,8,0.15)] bg-yellow-900/10' : 'border-gray-700'} ${p.id === winnerId ? 'border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.3)] bg-purple-900/20' : ''}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-200 truncate pr-2">
                      {p.name} {p.id === socket.id ? <span className="text-indigo-400 text-xs ml-1">(Ви)</span> : ''}
                    </span>
                    <span className="text-yellow-500 font-bold text-sm shrink-0 bg-gray-800 px-2 py-0.5 rounded-md border border-gray-700">{p.score} 🏆</span>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    {p.isHost && <span className="text-[10px] bg-indigo-900/80 text-indigo-200 border border-indigo-700 px-2 py-0.5 rounded-full font-medium">Хост</span>}
                    {p.id === czarId && gameStatus !== 'game_over' && <span className="text-[10px] bg-yellow-900/80 text-yellow-200 border border-yellow-700 px-2 py-0.5 rounded-full font-bold">👑 Цар</span>}
                    {p.id === winnerId && <span className="text-[10px] bg-purple-900/80 text-purple-200 border border-purple-700 px-2 py-0.5 rounded-full font-bold">🌟 ПЕРЕМОЖЕЦЬ</span>}
                    
                    {gameStatus === 'playing' && !p.isHost && p.id !== czarId && (
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${p.hasPlayed ? 'bg-green-900/50 text-green-300 border-green-800' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                        {p.hasPlayed ? '✓ Карта на столі' : 'Думає...'}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* === ПРАВАЯ КОЛОНКА: ИГРОВОЙ СТОЛ === */}
          <div className="w-full lg:w-3/4 bg-gray-800 p-6 md:p-10 rounded-2xl shadow-xl border border-gray-700 min-h-[600px] flex flex-col">
            
            {/* СОСТОЯНИЕ: ОЖИДАНИЕ ИГРОКОВ */}
            {gameStatus === 'waiting' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mb-6 border-4 border-gray-700 animate-pulse">
                  <span className="text-3xl">⏳</span>
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Очікування гравців</h2>
                <p className="text-gray-400 mb-8 max-w-md">
                  {players.length < 3 
                    ? `Гра почнеться, Коли набереться хоча б 3 гравця. Не вистачає ще ${3 - players.length}.` 
                    : 'Команда в зборі! Хост кімнати може починати гру.'}
                </p>
                
                {socket.id === hostId ? (
                  <button
                    onClick={startGame}
                    disabled={!canStart}
                    className={`px-10 py-4 rounded-xl font-bold text-lg transition-all transform ${
                      canStart 
                        ? 'bg-green-600 hover:bg-green-500 text-white cursor-pointer hover:scale-105 shadow-[0_0_30px_rgba(34,197,94,0.3)]' 
                        : 'bg-gray-700 text-gray-500 cursor-not-allowed border border-gray-600'
                    }`}
                  >
                    Почати гру
                  </button>
                ) : (
                  <div className="bg-gray-900 px-6 py-3 rounded-lg border border-gray-700">
                    <p className="text-gray-400 text-sm italic">Очікуємо поки хост натисне кнопку старту...</p>
                  </div>
                )}
              </div>
            )}

            {/* СОСТОЯНИЕ: ИГРА ИДЕТ (ВЫБОР КАРТ) */}
            {gameStatus === 'playing' && (
              <div className="flex flex-col items-center flex-1">
                <div className="bg-green-900/20 border border-green-800 text-green-400 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider uppercase mb-8">
                  Раунд почався
                </div>
                
                {/* Черная карта на столе */}
                <div className="bg-black text-white p-6 rounded-2xl w-full max-w-[280px] aspect-[4/5] flex flex-col justify-between shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-gray-700 mb-10 transform -rotate-1 hover:rotate-0 transition-transform">
                  <p className="text-2xl font-bold leading-tight text-left break-words">{blackCard}</p>
                  <div className="text-[10px] text-gray-500 font-bold tracking-widest text-left uppercase">Cards Against Humanity</div>
                </div>

                {/* Интерфейс взависимости от роли */}
                {socket.id === czarId ? (
                  <div className="w-full max-w-lg bg-yellow-900/10 p-6 rounded-2xl border border-yellow-700/30 text-center">
                    <p className="text-yellow-500 font-bold text-2xl mb-2 flex items-center justify-center gap-2">
                      <span>👑</span> Ви Цар Карт!
                    </p>
                    <p className="text-gray-400 text-sm mb-6">Ваша задача — дочекатися відповідей та вибрати найсмішнішу.</p>
                    
                    <div className="bg-gray-900 rounded-full h-3 w-full overflow-hidden border border-gray-700/50 relative">
                      <div 
                        className="bg-yellow-500 h-full transition-all duration-500 ease-out" 
                        style={{ width: `${(playedCardsCount / (players.length - 1)) * 100}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-yellow-600 mt-3 font-bold uppercase tracking-widest">
                      Зібрано карт: {playedCardsCount} із {players.length - 1}
                    </p>
                  </div>
                ) : currentPlayer?.hasPlayed ? (
                  <div className="w-full max-w-lg bg-green-900/10 p-6 rounded-2xl border border-green-800/30 text-center animate-fade-in">
                    <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/30">
                      <span className="text-2xl">✅</span>
                    </div>
                    <p className="text-green-400 font-bold text-xl mb-2">Відповідь прийнята!</p>
                    <p className="text-gray-400 text-sm">Карта лягла на стіл рубашкою догори. Очікуємо інших гравців...</p>
                  </div>
                ) : (
                  <div className="w-full animate-slide-up">
                    <p className="text-indigo-300 font-bold mb-4 text-center md:text-left text-lg uppercase tracking-wider text-sm">
                      Ваша рука (виберіть карту):
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {currentPlayer?.hand?.map((card, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => playCard(card)}
                          className="bg-white text-black p-5 rounded-xl aspect-[4/5] flex flex-col justify-between text-left transition-all group cursor-pointer border-4 border-transparent hover:border-indigo-500 hover:-translate-y-3 hover:shadow-[0_15px_30px_rgba(255,255,255,0.15)] shadow-lg"
                        >
                          <span className="font-bold text-base leading-snug break-words">{card}</span>
                          <span className="text-[11px] bg-black text-white px-3 py-1.5 rounded-full font-bold opacity-0 group-hover:opacity-100 transition-opacity uppercase text-center self-center transform translate-y-2 group-hover:translate-y-0 shrink-0">
                            Сыграть
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* СОСТОЯНИЕ: ГОЛОСОВАНИЕ (ВЫБОР ПОБЕДИТЕЛЯ) */}
            {gameStatus === 'voting' && (
              <div className="flex flex-col items-center w-full flex-1">
                <div className="bg-purple-900/20 border border-purple-800 text-purple-400 px-4 py-1.5 rounded-full text-sm font-bold tracking-wider uppercase mb-6">
                  Голосування
                </div>
                
                <h2 className="text-3xl font-bold text-white mb-2 text-center">Вибір переможця</h2>
                <p className="text-gray-400 text-sm mb-10 text-center max-w-md">
                  {socket.id === czarId 
                    ? "Ви — Цар! Прочитайте відповіді та клікніть на ту, котора розривніше усього доповнює чорну карту." 
                    : "Цар читає відповіді..."}
                </p>

                <div className="flex flex-col lg:flex-row gap-8 items-center lg:items-start w-full">
                  {/* Черная карта */}
                  <div className="shrink-0 bg-black text-white p-6 rounded-2xl w-full max-w-[280px] aspect-[4/5] flex flex-col justify-between shadow-[0_10px_40px_rgba(0,0,0,0.4)] border border-gray-700 relative z-10 lg:-mr-6 lg:mt-4">
                    <p className="text-xl font-bold leading-snug text-left break-words">{blackCard}</p>
                    <div className="text-[10px] text-gray-500 font-bold tracking-widest text-left uppercase">Cards Against Humanity</div>
                  </div>

                  {/* Белые карты на столе */}
                  <div className="flex-1 w-full bg-gray-900/50 p-6 rounded-3xl border border-gray-700/50 lg:pl-12">
                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                      {playedCards.map((card, idx) => (
                        <button
                          key={idx}
                          onClick={() => socket.id === czarId && pickWinner(card.playerId)}
                          disabled={socket.id !== czarId}
                          className={`bg-white text-black p-5 rounded-xl aspect-[4/5] flex flex-col justify-between text-left transition-all relative overflow-hidden group w-full max-w-[280px] mx-auto ${
                            socket.id === czarId 
                              ? 'hover:-translate-y-2 hover:shadow-[0_10px_30px_rgba(168,85,247,0.3)] cursor-pointer border-4 border-transparent hover:border-purple-500' 
                              : 'cursor-default opacity-95'
                          }`}
                        >
                          <span className="font-bold text-lg leading-snug z-10 relative break-words">{card.text}</span>
                          
                          {socket.id === czarId && (
                            <>
                              <div className="absolute inset-0 bg-gradient-to-t from-purple-100 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"></div>
                              <span className="text-[10px] bg-purple-600 text-white px-3 py-1.5 rounded-full font-bold uppercase tracking-widest block text-center transform translate-y-4 group-hover:translate-y-0 opacity-0 group-hover:opacity-100 transition-all z-10">
                                🏆 Выбрать
                              </span>
                            </>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
{/* НОВОЕ СОСТОЯНИЕ: ПОКАЗ РЕЗУЛЬТАТОВ РАУНДА */}
            {gameStatus === 'showing_results' && roundResults && (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in w-full">
                <div className="mb-8">
                  <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 mb-3 drop-shadow-lg animate-bounce">
                    Раунд виграв(ла) {roundResults.winnerName}! 🎉
                  </h2>
                  <p className="text-green-400 font-bold tracking-widest uppercase text-sm">+1 бал у скарбничку</p>
                </div>

                <div className="flex flex-col md:flex-row gap-6 md:gap-10 mb-12 items-center justify-center w-full">
                  {/* Черная карта */}
                  <div className="shrink-0 bg-black text-white p-6 rounded-2xl w-full max-w-[280px] aspect-[4/5] flex flex-col justify-between shadow-[0_10px_40px_rgba(0,0,0,0.5)] border border-gray-700 transform -rotate-2">
                    <p className="text-xl font-bold leading-snug text-left break-words">{roundResults.blackCard}</p>
                    <div className="text-[10px] text-gray-500 font-bold tracking-widest text-left uppercase">Cards Against Humanity</div>
                  </div>
                  
                  {/* Победившая белая карта */}
                  <div className="shrink-0 bg-white text-black p-6 rounded-2xl w-full max-w-[280px] aspect-[4/5] flex flex-col justify-between shadow-[0_0_50px_rgba(52,211,153,0.3)] border-4 border-green-500 transform rotate-2 scale-105 z-10">
                    <p className="text-xl font-bold leading-snug text-left break-words">{roundResults.winningCard}</p>
                    <div className="text-[10px] text-gray-500 font-bold tracking-widest text-left uppercase">Cards Against Humanity</div>
                  </div>
                </div>

                <div className="bg-gray-900/80 px-8 py-4 rounded-full border border-gray-700 animate-pulse shadow-lg">
                  <p className="text-gray-300 font-medium flex items-center gap-3">
                    <span className="text-xl">⏳</span> Наступний раунд почнеться через 3 секунди...
                  </p>
                </div>
              </div>
            )}
            {/* НОВОЕ СОСТОЯНИЕ: ИГРА ОКОНЧЕНА */}
            {gameStatus === 'game_over' && (
              <div className="flex-1 flex flex-col items-center justify-center text-center animate-fade-in">
                <div className="text-[80px] mb-4 drop-shadow-xl animate-bounce">🏆</div>
                <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-yellow-600 mb-6 tracking-wide uppercase">
                  Гра завершена!
                </h2>
                
                <div className="bg-gray-900/80 p-8 rounded-3xl border border-purple-500/30 shadow-[0_0_50px_rgba(168,85,247,0.15)] mb-10 w-full max-w-md">
                  <p className="text-gray-400 uppercase tracking-widest text-sm font-bold mb-2">Переможець</p>
                  <p className="text-3xl font-bold text-purple-400 truncate">{gameWinner?.name || "Хтось дуже анонімний"}</p>
                  <p className="text-yellow-500 font-bold text-xl mt-4">Набрав {gameWinner?.score} балів!</p>
                </div>

                {socket.id === hostId ? (
                  <button
                    onClick={restartGame}
                    className="bg-purple-600 hover:bg-purple-500 px-10 py-4 rounded-xl font-bold text-lg transition-all transform hover:scale-105 shadow-[0_0_30px_rgba(168,85,247,0.4)]"
                  >
                    Грати ще раз
                  </button>
                ) : (
                  <p className="text-gray-400 italic text-sm">Чекаємо, поки хост запустить нову партію...</p>
                )}
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}



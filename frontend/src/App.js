import './App.css';
import { useChatbotEngine } from './domain/ChatbotEngine.tsx';
import { useEffect, useState, useRef, useMemo } from 'react';
import { renderChatbot } from './ui/render.js';
import ReactDOM from 'react-dom';
import { Mutex } from 'async-mutex';
// import 'dotenv/config';

const EMOJI_MUTEX_TIME = 1000;

function FloatingText({text}) {
  return ReactDOM.createPortal(
    <div style={{
      // color: 'white',
      zIndex: 9999,
      position: 'fixed',
      top: '0%',
      left: '0%',
      transform: 'translateX(0%)',
      fontSize: '24px',
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(255, 255, 255, 0.0)',
      alignItems: 'flex-end',
      justifyContent: 'center',
      display: 'flex',
    }}>
      <div style={{backgroundColor: 'rgba(255, 255, 255, 0.5)', width: '100%', margin: '50px', padding: '20px', borderRadius: '30px', fontSize: '24px', color: 'white', justifyContent: 'flex-start'}}>
        { text && text !== "" && text.split('\n').map((line, index) => (
          <div key={index} style={{padding: '0px', borderRadius: '30px', fontSize: '24px', color: 'white'}}>
            {line}
          </div>
        ))}
      </div>
    </div>,
    document.body // Mount to the real <body> so it survives view changes
  );
}

function App() {
  // const [eyesAnimation, setEyesAnimation] = useState(null);
  const eyesAnimation = useRef(undefined);
  const mutex = useRef(new Mutex());
  // const [controller, setController] = useState(null);
  const initialized = useRef(false);

  const controller = useMemo(() => {
    return {
      thinking: () => {
        if (!mutex.current.isLocked()) {
          mutex.current.acquire().then((release) => {
            try {
              console.log(`chatbot emoji controller: thinking , animation is undefined: ${!eyesAnimation.current}`);
              eyesAnimation.current?.cancelSleep();
              eyesAnimation.current?.think();
            } catch (e) {
              console.error('chatbot emoji controller: thinking, error: ', e);
            }
            
            setTimeout(() => {
              try {
                console.log(`chatbot emoji controller: thinking, release mutex`);
                release();
              } catch (e) {
                console.error('chatbot emoji controller: thinking, error: ', e);
              }
            }, EMOJI_MUTEX_TIME);
          });
        }
      },
      speaking: () => {
        if (!mutex.current.isLocked()) {
          mutex.current.acquire().then((release) => {
            try {
              console.log(`chatbot emoji controller: speaking, animation is undefined: ${!eyesAnimation.current}`);
              eyesAnimation.current?.cancelThink();
              eyesAnimation.current?.smile();
            } catch (e) {
              console.error('chatbot emoji controller: speaking, error: ', e);
            }
            
            setTimeout(() => {
              try {
                console.log(`chatbot emoji controller: speaking, release mutex`);
                release();
              } catch (e) {
                console.error('chatbot emoji controller: speaking, error: ', e);
              }
            }, EMOJI_MUTEX_TIME);
          });
        }
      },
      idle: () => {
        if (!mutex.current.isLocked()) {
          mutex.current.acquire().then((release) => {
            try {
              console.log(`chatbot emoji controller: idle, animation is undefined: ${!eyesAnimation.current}`);
              eyesAnimation.current?.cancelThink();
              eyesAnimation.current?.cancelSmile();
              eyesAnimation.current?.focus();
            } catch (e) {
              console.error('chatbot emoji controller: idle, error: ', e);
            }
            
            setTimeout(() => {
              try {
                console.log(`chatbot emoji controller: idle, release mutex`);
                release();
              } catch (e) {
                console.error('chatbot emoji controller: idle, error: ', e);
              }
            }, EMOJI_MUTEX_TIME);
          });
        }
      },
      listening: () => {
        if (!mutex.current.isLocked()) {
          mutex.current.acquire().then((release) => {
            console.log(`charbot emoji controller: listening animation is undefined: ${!eyesAnimation.current}`);
            eyesAnimation.current?.cancelSmile();
            eyesAnimation.current?.focus();
            
            setTimeout(() => {
              try {
                console.log(`chatbot emoji controller: listening, release mutex`);
                release();
              } catch (e) {
                console.error('chatbot emoji controller: listening, error: ', e);
              }
            }, EMOJI_MUTEX_TIME);
          });
        }
      },
      sleep: () => {
        if (!mutex.current.isLocked()) {
          mutex.current.acquire().then((release) => {
            console.log(`charbot emoji controller: sleep animation is undefined: ${!eyesAnimation.current}`);
            
            eyesAnimation.current?.sleep();
            
            setTimeout(() => {
              try {
                console.log(`chatbot emoji controller: sleep, release mutex`);
                release();
              } catch (e) {
                console.error('chatbot emoji controller: sleep, error: ', e);
              }
            }, EMOJI_MUTEX_TIME);
          });
        }
      },
    }
}, [eyesAnimation]);

  const { engineState, transcript, taskArrangementText } = useChatbotEngine(controller);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true
      renderChatbot(document.body).then((animation) => {
        // setEyesAnimation(animation);
        eyesAnimation.current = animation;
        eyesAnimation.current?.sleep();
        console.log('chatbot emoji animation: ', animation);
      });
    }
  }, []);

  return (
    <div id="root" className="App">
      {/* <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>Chatbot Engine</p>
        <p>{transcript}</p>
        <p>Engine State: {engineState}</p>
      </header> */}
      { taskArrangementText && taskArrangementText !== "" &&
        <FloatingText text={taskArrangementText}/>
      }
    </div>
  );
}

export default App;

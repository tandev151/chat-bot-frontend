import React, { Suspense, useState } from 'react';

const ChatContainer = () => {
  const LazyComponent = React.lazy(() => import('./Message'));
  const [showComponent, setShowComponent] = useState(false);

  const handleClick = () => {
    setShowComponent(true);
  };
  return (
    <>
      <div className='app-container'>
        <header className='app-header'>
          <h1>Native WebSocket Chat</h1>
          <button onClick={handleClick}>Show Component</button>
        </header>
        <Suspense fallback={<div>Loading...</div>}>
          {showComponent && <LazyComponent />}
        </Suspense>
      </div>
    </>
  );
};

export default ChatContainer;

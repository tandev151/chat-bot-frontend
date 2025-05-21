import { FormEvent, useEffect, useRef, useState } from 'react';

// Define the structure of a message object (good practice to send/receive JSON)
interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'server' | string; // 'user' for self, 'server' for messages from the server
  timestamp: Date;
}

// Define the backend WebSocket URL (MUST point to your NATIVE WebSocket server)
const NATIVE_WS_SERVER_URL = 'ws://localhost:3000'; // Adjust if your NestJS server (with ws adapter) runs elsewhere

export default function Message() {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const messagesEndRef = useRef<null | HTMLDivElement>(null);

  useEffect(() => {
    const ws = new WebSocket(NATIVE_WS_SERVER_URL);

    ws.onopen = (event) => {
      console.log('Native WebSocket Connection opened:', event);
      setIsConnected(true);
      // Example: Send an initial message or client identifier
      // ws.send(JSON.stringify({ type: 'client_hello', id: 'user123' }));
    };

    ws.onmessage = (event) => {
      console.log('Raw message from server:', event.data);
      let newMsg: ChatMessage;
      try {
        // Attempt to parse if the server sends JSON strings
        const receivedData = JSON.parse(event.data as string);

        // Adapt this based on the actual structure your server sends
        newMsg = {
          id: receivedData.id || `${Date.now()}-server-${Math.random()}`,
          text: receivedData.text || 'Invalid message format',
          sender: receivedData.sender || 'server',
          timestamp: receivedData.timestamp
            ? new Date(receivedData.timestamp)
            : new Date()
        };
      } catch (e) {
        // If it's not JSON or parsing fails, treat as plain text from server
        newMsg = {
          id: `${Date.now()}-server-text-${Math.random()}`,
          text: event.data as string,
          sender: 'server',
          timestamp: new Date()
        };
      }
      setMessages((prevMessages) => [...prevMessages, newMsg]);
    };

    ws.onerror = (event) => {
      console.error('Native WebSocket Error:', event);
      // setIsConnected(false); // You might want to set this depending on the error
    };

    ws.onclose = (event) => {
      console.log(
        'Native WebSocket Connection closed:',
        event.code,
        event.reason
      );
      setIsConnected(false);
      // You would implement reconnection logic here if desired
    };

    setSocket(ws);

    // Cleanup function: close the WebSocket connection when the component unmounts
    return () => {
      if (
        ws.readyState === WebSocket.OPEN ||
        ws.readyState === WebSocket.CONNECTING
      ) {
        ws.close();
      }
    };
  }, []); // Empty dependency array means this effect runs once on mount and cleans up on unmount

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    if (
      currentMessage.trim() &&
      socket &&
      socket.readyState === WebSocket.OPEN
    ) {
      // Always send strings. If sending objects, stringify them.
      const messageObject = {
        text: currentMessage.trim(),
        sender: 'user', // Client identifies itself
        timestamp: new Date().toISOString()
      };
      socket.send(JSON.stringify(messageObject));

      // Optimistically add to UI (server should confirm/broadcast this)
      // This helps with perceived speed.
      // const optimisticMessage: ChatMessage = {
      //   id: `${Date.now()}-user-${Math.random()}`,
      //   text: currentMessage.trim(),
      //   sender: 'user',
      //   timestamp: new Date()
      // };

      // setMessages((prev) => [...prev, optimisticMessage]);

      setCurrentMessage('');
    } else {
      console.log('WebSocket not connected or message empty.');
    }
  };

  return (
    <>
      <p className='connection-status'>
        Status:{' '}
        {isConnected ? (
          <span className='connected'>Connected</span>
        ) : (
          <span className='disconnected'>Disconnected</span>
        )}
      </p>

      <div className='chat-window'>
        <div className='messages-list'>
          {messages.map((msg) => (
            <div key={msg.id} className={`message-item message-${msg.sender}`}>
              <div className='message-content'>
                {/* Optional: Differentiate display based on sender */}
                <strong>{msg.sender === 'user' ? 'You' : 'Server'}: </strong>
                <span className='message-text'>{msg.text}</span>
                <span className='message-timestamp'>
                  {new Date(msg.timestamp).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
        {/* Typing indicators would need a custom message protocol (e.g., sending JSON like {type: 'typing'}) */}
      </div>

      <form className='message-form' onSubmit={handleSendMessage}>
        <input
          type='text'
          value={currentMessage}
          onChange={(e) => setCurrentMessage(e.target.value)}
          placeholder='Type your message...'
          aria-label='Message input'
          disabled={!isConnected}
        />
        <button type='submit' disabled={!isConnected || !currentMessage.trim()}>
          Send
        </button>
      </form>
    </>
  );
}

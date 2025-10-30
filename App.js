import React, { useState } from 'react';
import './App.css';

function App() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('Welcome to React!');

  const handleIncrement = () => {
    setCount(count + 1);
  };

  const handleDecrement = () => {
    setCount(count - 1);
  };

  const handleReset = () => {
    setCount(0);
  };

  const handleMessageChange = (e) => {
    setMessage(e.target.value);
  };

  return (
    <div className="App">
      <header className="App-header">
        <h1>{message}</h1>
        
        <div className="counter-section">
          <h2>Counter: {count}</h2>
          <div className="button-group">
            <button onClick={handleIncrement} className="btn btn-primary">
              Increment
            </button>
            <button onClick={handleDecrement} className="btn btn-secondary">
              Decrement
            </button>
            <button onClick={handleReset} className="btn btn-danger">
              Reset
            </button>
          </div>
        </div>

        <div className="message-section">
          <h3>Change the welcome message:</h3>
          <input
            type="text"
            value={message}
            onChange={handleMessageChange}
            className="message-input"
            placeholder="Enter your message..."
          />
        </div>

        <div className="info-section">
          <p>This is a simple React app with:</p>
          <ul>
            <li>State management with useState hook</li>
            <li>Event handling</li>
            <li>Interactive components</li>
            <li>Modern React patterns</li>
          </ul>
        </div>
      </header>
    </div>
  );
}

export default App;

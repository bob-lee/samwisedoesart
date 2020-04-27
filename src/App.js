import React from 'react';
// import { ReactComponent as Logo } from './logo.svg'
// import logo from './IMG_2040.JPG';
// import './App.css';
if (typeof window !== 'undefined') {
  require('./App.css')
}

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <div className="cover-image" />
        {/* <img src={logo} className="cover-image" alt="logo" /> */}
        {/* <Logo /> */}
        <p>
          Samwise does art
        </p>
        {/* <a
          className="App-link"
          href="https://joanne-lee.web.app"
          target="_blank"
          rel="noopener noreferrer"
        >
          Joanne's website
        </a> */}
      </header>
    </div>
  );
}

export default App;

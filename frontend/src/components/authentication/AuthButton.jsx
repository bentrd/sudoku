import React from 'react'

const AuthButton = ({onClick, text, color}) => {

    text = text || 'Click Me';
    color = color || '#007bff';

    if (typeof onClick !== 'object' && typeof onClick !== 'function') {
        console.error('onClick must be a function', typeof onClick);
        return null;
    }
    if (typeof text !== 'string') {
        console.error('text must be a string', typeof text);
        return null;
    }
    if (color && typeof color !== 'string') {
        console.error('color must be a string', typeof color);
        return null;
    }
    if (color && !/^#[0-9A-F]{6}$/i.test(color)) {
        console.error('color must be a valid hex color code', color);
        return null;
    }

    const style = {
        backgroundColor: color,
        color: 'white',
        border: 'none',
        padding: '10px 20px',
        borderRadius: '5px',
        cursor: 'pointer',
        fontSize: '16px',
        minWidth: '150px',
    }

  return (
    <button
        onClick={onClick}
        style={style}
    >
        {text}
    </button>
  )
}

export default AuthButton
import React from 'react';
import PropTypes from 'prop-types';

const Button = ({ children, type = 'button', loading = false, className = '', onClick }) => {
  return (
    <button
      type={type}
      className={`btn ${className} ${loading ? 'loading' : ''}`}
      disabled={loading}
      onClick={onClick}
    >
      {loading ? 'Loading...' : children}
    </button>
  );
};

Button.propTypes = {
  children: PropTypes.node,
  type: PropTypes.oneOf(['button', 'submit', 'reset']),
  loading: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func,
};

export default Button;

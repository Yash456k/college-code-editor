import React from 'react';
import Avatar from 'react-avatar';

const Client = ({ username, role, showPromote, onPromote, toggleLabel }) => {
    return (
        <div className="client">
            <Avatar name={username} size={50} round="14px" />
            <span className="userName">{username}</span>
            <span className={`roleTag role-${role}`}>{role}</span>
            {showPromote && (
                <button className="promoteBtn" onClick={onPromote}>
                    {toggleLabel}
                </button>
            )}
        </div>
    );
};

export default Client;

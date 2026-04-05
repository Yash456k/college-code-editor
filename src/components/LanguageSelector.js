import React from 'react';
import './LanguageSelector.css';

const LanguageSelector = ({ language, onChange, disabled }) => {
    const languages = [
        { value: 'python', label: 'Python', icon: '🐍' },
        { value: 'javascript', label: 'JavaScript', icon: '📜' },
        { value: 'java', label: 'Java', icon: '☕' },
        { value: 'cpp', label: 'C++', icon: '⚙️' },
        { value: 'c', label: 'C', icon: '🔧' },
    ];

    return (
        <div className="languageSelectorContainer">
            <label className="languageLabel">Language:</label>
            <select
                className="languageSelect"
                value={language}
                onChange={(e) => onChange(e.target.value)}
                disabled={disabled}
            >
                {languages.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                        {lang.icon} {lang.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default LanguageSelector;

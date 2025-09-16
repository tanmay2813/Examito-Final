import React from 'react';

// FIX: This component violates the API key guidelines, which require using environment variables
// exclusively and not prompting the user for a key. The component is disabled by returning null,
// which also resolves the error "Property 'setApiKey' does not exist on type 'AppContextType'".
const ApiKeyPrompt: React.FC = () => {
    return null;
};

export default ApiKeyPrompt;

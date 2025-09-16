


import React from 'react';
import type { ConceptMapNode } from '../types';

interface ConceptMapModalProps {
    data: ConceptMapNode;
    onClose: () => void;
}

const RenderNode: React.FC<{ node: ConceptMapNode; isRoot?: boolean }> = ({ node, isRoot = false }) => (
    <div className={`flex items-stretch ${isRoot ? '' : 'pl-8'}`}>
        <div className="flex flex-col items-center mr-4">
            {!isRoot && <div className="w-px bg-gray-300 dark:bg-gray-600 h-1/2"></div>}
            <div
                className={`text-sm sm:text-base px-3 py-2 rounded-lg shadow-md z-10 whitespace-nowrap font-semibold ${
                    isRoot 
                    ? 'bg-green-500 text-white' 
                    : 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-100'
                }`}
            >
                {node.topic}
            </div>
            {!isRoot && <div className="w-px bg-gray-300 dark:bg-gray-600 h-1/2"></div>}
        </div>
        
        {node.children && node.children.length > 0 && (
            <div className="flex flex-col justify-center border-l-2 border-gray-300 dark:border-gray-600">
                {node.children.map((child, index) => (
                    <div key={index} className="relative">
                         <div className="absolute -left-px top-1/2 w-8 h-px bg-gray-300 dark:bg-gray-600"></div>
                         <RenderNode node={child} />
                    </div>
                ))}
            </div>
        )}
    </div>
);


const ConceptMapModal: React.FC<ConceptMapModalProps> = ({ data, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-3xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold">Concept Map</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 text-2xl font-bold">&times;</button>
                </div>
                <div className="overflow-auto pr-4 -ml-2">
                     <RenderNode node={data} isRoot={true} />
                </div>
            </div>
        </div>
    );
};

export default ConceptMapModal;
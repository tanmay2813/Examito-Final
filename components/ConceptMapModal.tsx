
import React from 'react';
import type { ConceptMapNode } from '../types';

interface ConceptMapModalProps {
    data: ConceptMapNode;
    onClose: () => void;
}

const RenderNode: React.FC<{ node: ConceptMapNode }> = ({ node }) => (
    <li className="relative pl-8 before:content-[''] before:absolute before:left-0 before:top-4 before:w-6 before:h-px before:bg-gray-400 dark:before:bg-gray-500">
        <div className="relative p-2 pl-4 bg-gray-100 dark:bg-gray-700 rounded-md mb-2 inline-block border-l-4 border-green-500">
            <span className="font-semibold">{node.topic}</span>
        </div>
        {node.children && node.children.length > 0 && (
            <ul className="list-none pt-2">
                {node.children.map((child, index) => <RenderNode key={index} node={child} />)}
            </ul>
        )}
    </li>
);

const ConceptMapModal: React.FC<ConceptMapModalProps> = ({ data, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 animate-fade-in p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-2xl max-h-[80vh] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Concept Map</h2>
                    <button onClick={onClose} className="text-2xl font-bold">&times;</button>
                </div>
                <div className="overflow-y-auto pr-4">
                    <ul className="list-none space-y-2">
                         <RenderNode node={data} />
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default ConceptMapModal;

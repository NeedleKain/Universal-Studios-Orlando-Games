import React, { useState } from 'react';
import type { InvestigationEvidence } from '../../types';

interface EvidenceViewProps {
  evidence: InvestigationEvidence[];
}

export const EvidenceView: React.FC<EvidenceViewProps> = ({ evidence }) => {
    const [selectedEvidence, setSelectedEvidence] = useState<InvestigationEvidence | null>(null);

    if (selectedEvidence) {
        return (
            <div className="animate-fade-in">
                <button onClick={() => setSelectedEvidence(null)} className="mb-4 font-bold text-[--color-accent]">&larr; Retour aux preuves</button>
                <h3 className="text-2xl font-bold text-white mb-2">{selectedEvidence.title}</h3>
                {selectedEvidence.imageUrl ? (
                    <img src={selectedEvidence.imageUrl} alt={selectedEvidence.title} className="rounded-lg w-full max-w-md mx-auto mb-4" />
                ) : <p className="text-gray-400">Image non disponible.</p>}
                <p className="text-gray-300">{selectedEvidence.description}</p>
            </div>
        )
    }

    return (
        <div>
            <h3 className="text-xl font-bold text-white mb-4">Casier à Preuves</h3>
            {evidence.length === 0 ? (
                <p className="text-gray-400">Aucune preuve collectée pour le moment.</p>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {evidence.map(item => (
                        <button key={item.id} onClick={() => setSelectedEvidence(item)} className="p-2 bg-gray-800 rounded-lg text-center hover:bg-gray-700 transition-colors animate-fade-in">
                           {item.imageUrl ? (
                             <img src={item.imageUrl} alt={item.title} className="w-full h-24 object-cover rounded mb-2" />
                           ) : <div className="w-full h-24 bg-gray-700 rounded mb-2 flex items-center justify-center text-gray-500">?</div>}
                            <p className="text-sm font-semibold text-white truncate">{item.title}</p>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
};

// Débounce pour limiter les appels API
const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };
  
// Crée l'overlay des suggestions
const createOverlay = () => {
    const overlay = document.createElement('div');
    overlay.className = 'ai-suggestion';
    document.body.appendChild(overlay);
    return overlay;
};
  
// Met à jour la position de l'overlay
const updateOverlayPosition = (element, overlay, cursorPos) => {
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    
    // Calcul différent pour les éléments contenteditables
    if (element.isContentEditable) {
      const range = document.getSelection().getRangeAt(0);
      const caretRect = range.getBoundingClientRect();
      overlay.style.left = `${caretRect.right}px`;
      overlay.style.top = `${caretRect.top}px`;
    } else {
      const fontSize = parseInt(style.fontSize) || 16;
      const charWidth = fontSize * 0.6;
      overlay.style.left = `${rect.left + (cursorPos * charWidth)}px`;
      overlay.style.top = `${rect.top + rect.height + 5}px`;
    }
    
    overlay.style.font = style.font;
};
  
  // Insère la suggestion
const insertSuggestion = (element, suggestion) => {
    if (element.isContentEditable) {
      const selection = window.getSelection();
      const range = selection.getRangeAt(0);
      range.deleteContents();
      range.insertNode(document.createTextNode(suggestion));
    } else {
      const start = element.selectionStart;
      element.value = element.value.slice(0, start) + suggestion + element.value.slice(element.selectionEnd);
      element.selectionStart = element.selectionEnd = start + suggestion.length;
    }
};
  
// Gestionnaire de saisie avec débounce
const handleInput = debounce(async (element, overlay) => {
    let text, cursorPos;
    
    if (element.isContentEditable) {
      text = element.innerText;
      cursorPos = window.getSelection().anchorOffset;
    } else {
      text = element.value;
      cursorPos = element.selectionStart;
    }
    
    if (text.length < 3) {
      overlay.textContent = '';
      return;
    }
  
    try {
      const suggestion = await getAISuggestion(text.slice(0, cursorPos));
      overlay.textContent = suggestion;
      updateOverlayPosition(element, overlay, cursorPos);
    } catch (error) {
      console.error('Erreur API:', error);
    }
}, 300);
  
// Détection des nouveaux éléments
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          initTextAreas(node);
        }
      });
    });
});
  
// Initialisation de l'extension
function init() {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: false,
      characterData: false
});
  
    initTextAreas(document);
}
  
// Fonction d'initialisation principale
function initTextAreas(root = document) {
    root.querySelectorAll('input:not([type="hidden"]):not([type="password"]), textarea, [contenteditable="true"]').forEach(element => {
      if (element.dataset.autocompleteEnabled) return;
      
      const overlay = createOverlay();
      let suggestion = null;
  
      // Gestion des événements
      const eventHandler = () => handleInput(element, overlay);
      
      element.addEventListener('input', eventHandler);
      element.addEventListener('scroll', eventHandler);
      element.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey && overlay.textContent) {
          e.preventDefault();
          insertSuggestion(element, overlay.textContent);
          overlay.textContent = '';
        }
      });
  
      // Marquer l'élément comme initialisé
      element.dataset.autocompleteEnabled = 'true';
    });
}
  
// ... (le reste du code reste identique jusqu'à getAISuggestion)

async function getAISuggestion(prompt) {
    const API_KEY = "YOUR KEY"; 

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: "gpt-3.5-turbo",
                messages: [{ 
                    role: "user", 
                    content: prompt 
                }],
                max_tokens: 20,
                temperature: 0.7
            })
        });

        const data = await response.json();
        return data.choices[0].message.content;

    } catch (error) {
        console.error('Erreur API:', error);
        return '';
    }
}

  
  
// Démarrage de l'extension
document.addEventListener('DOMContentLoaded', init);
document.addEventListener('readystatechange', () => {
    if (document.readyState === 'complete') init();
});
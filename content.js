//
// Debounce function to limit API calls
//
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    // Clears the existing timer if the function is called again
    clearTimeout(timeoutId);
    // Sets a new timer; 'func' will only be called after 'delay' ms
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

//
// Creates the overlay element for displaying AI suggestions
//
const createOverlay = () => {
  // Create a new <div> element
  const overlay = document.createElement('div');
  // Assign a CSS class for styling
  overlay.className = 'ai-suggestion';
  // Append it to the <body> so it's positioned absolutely on the page
  document.body.appendChild(overlay);
  return overlay;
};

//
// Updates the overlay position on the screen based on the cursor
//
const updateOverlayPosition = (element, overlay, cursorPos) => {
  // Get the bounding rectangle of the target element
  const rect = element.getBoundingClientRect();
  // Get the computed styles (font, etc.) of the target element
  const style = window.getComputedStyle(element);
  
  // If the element is contentEditable (like a rich text field)
  if (element.isContentEditable) {
    // Get the current selection (caret) in the document
    const range = document.getSelection().getRangeAt(0);
    // The caretRect gives us the exact position of the caret in the viewport
    const caretRect = range.getBoundingClientRect();
    // Position the overlay slightly to the right of the caret
    overlay.style.left = `${caretRect.right}px`;
    overlay.style.top = `${caretRect.top}px`;
  } else {
    // For regular inputs/textarea, estimate the cursor position
    const fontSize = parseInt(style.fontSize) || 16;
    // Estimate character width based on font size (rough approximation)
    const charWidth = fontSize * 0.6;
    // Position the overlay horizontally by adding the estimated cursor position
    overlay.style.left = `${rect.left + (cursorPos * charWidth)}px`;
    // Position it just below the text field
    overlay.style.top = `${rect.top + rect.height + 5}px`;
  }
  
  // Match the target element's font to keep the overlay consistent
  overlay.style.font = style.font;
};

//
// Inserts the AI suggestion into the target element
//
const insertSuggestion = (element, suggestion) => {
  // If the element is contentEditable (like a <div>)
  if (element.isContentEditable) {
    // Use the Selection and Range APIs to insert text
    const selection = window.getSelection();
    const range = selection.getRangeAt(0);
    // Remove any highlighted text
    range.deleteContents();
    // Insert a new text node with the suggestion
    range.insertNode(document.createTextNode(suggestion));
  } else {
    // For <input> or <textarea>, manipulate the value string
    const start = element.selectionStart;
    // Insert the suggestion between the current selection start and end
    element.value =
      element.value.slice(0, start) +
      suggestion +
      element.value.slice(element.selectionEnd);
    // Move the cursor to the end of the inserted text
    element.selectionStart = element.selectionEnd = start + suggestion.length;
  }
};

//
// Debounced input handler that fetches AI suggestions
//
const handleInput = debounce(async (element, overlay) => {
  let text, cursorPos;
  
  // For contentEditable elements, get text content and cursor offset
  if (element.isContentEditable) {
    text = element.textContent || element.innerText;
    cursorPos = window.getSelection().anchorOffset;
  } else {
    // For standard <input> or <textarea>, get .value and .selectionStart
    text = element.value;
    cursorPos = element.selectionStart;
  }
  
  // If there's not enough text, clear the overlay and stop
  if (text.length < 3) {
    overlay.textContent = '';
    return;
  }

  try {
    // Call the OpenAI API to get a suggestion based on the text typed so far
    const suggestion = await getAISuggestion(text.slice(0, cursorPos));
    // Display the suggestion in the overlay
    overlay.textContent = suggestion;
    // Update the overlay's position on the screen
    updateOverlayPosition(element, overlay, cursorPos);
  } catch (error) {
    console.error('API Error:', error);
  }
}, 300);

//
// MutationObserver to detect new elements added to the DOM
//
const observer = new MutationObserver((mutations) => {
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      // If a new node is an element, initialize text areas inside it
      if (node.nodeType === Node.ELEMENT_NODE) {
        initTextAreas(node);
      }
    });
  });
});

//
// Initializes the extension: starts observing the DOM and sets up text areas
//
function init() {
  // Observe the document body for added nodes (childList) and deeper subtree
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: false,
    characterData: false
  });

  // Initialize text areas on the current document
  initTextAreas(document);
}

//
// Main function to find and set up text fields or contentEditable elements
//
function initTextAreas(root = document) {
  // Custom selectors for known contentEditable platforms (Gmail, YouTube, etc.)
  const customSelectors = [
    'div[contenteditable="true"]',   // Gmail
    'div#contenteditable-root',      // YouTube comments
    'div[role="textbox"]',           // Modern editors
    'div.ProseMirror',               // Rich text editors (Notion, etc.)
    'yt-formatted-string#content-text' // Existing YouTube comments
  ];

  // Combine with basic selectors for inputs and textareas
  const allSelectors = [
    'input:not([type="hidden"]):not([type="password"])',
    'textarea',
    ...customSelectors
  ].join(',');

  // Check for iframes (e.g., YouTube/Gmail might load content in an iframe)
  root.querySelectorAll('iframe').forEach(iframe => {
    try {
      // Recursively initialize text areas within the iframe document
      initTextAreas(iframe.contentDocument);
    } catch (e) {
      // Ignore CORS or access issues
    }
  });

  // Query all elements matching the combined selectors
  root.querySelectorAll(allSelectors).forEach(element => {
    // If it's already initialized, skip
    if (element.dataset.autocompleteEnabled) return;

    // Create the suggestion overlay for this element
    const overlay = createOverlay();
    
    // General event handler for input/scroll
    const eventHandler = () => {
      handleInput(element, overlay);
      // Force an overlay position update
      updateOverlayPosition(element, overlay, 0);
    };

    // Listen for typing and scrolling events
    element.addEventListener('input', eventHandler);
    element.addEventListener('scroll', eventHandler);
    
    // Special handling for YouTube elements
    if (element.matches('div#contenteditable-root, yt-formatted-string')) {
      element.addEventListener('click', eventHandler);
    }

    // Listen for the Tab key to accept the suggestion
    element.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey && overlay.textContent) {
        e.preventDefault();
        // Insert the suggestion into the text
        insertSuggestion(element, overlay.textContent);
        // Clear the overlay once the suggestion is inserted
        overlay.textContent = '';
      }
    });

    // Mark this element so we don't initialize it again
    element.dataset.autocompleteEnabled = 'true';
  });
}

//
// Function that calls the OpenAI API for a text suggestion
//
async function getAISuggestion(prompt) {
  
  const API_KEY = "Your OpenAI API key";

  try {
    // Make a POST request to the OpenAI completions endpoint
    const response = await fetch('https://api.openai.com/v1/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "davinci-002",   
        prompt: prompt,         
        max_tokens: 50,         
        temperature: 0.7        
      })
    });

    // Check if the response is OK
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // Parse the JSON data from the API response
    const data = await response.json();

    // Return the generated text, trimmed of extra spaces
    return data.choices[0].text.trim();

  } catch (error) {
    console.error('API Request Failed:', error);
    return "Error generating suggestion";
  }
}

//
// Run the 'init' function when the DOM is loaded
//
document.addEventListener('DOMContentLoaded', init);

//
// Also run 'init' when the document state is 'complete'
// (in case the DOMContentLoaded event fires too early)
//
document.addEventListener('readystatechange', () => {
  if (document.readyState === 'complete') init();
});

'use client';

import { useState, useMemo, useCallback, useEffect, useRef } from 'react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

// Emoji database with keywords for search
const EMOJI_KEYWORDS: Record<string, string[]> = {
  '😀': ['grinning', 'smile', 'happy', 'face', 'cười', 'vui'],
  '😃': ['grinning', 'big', 'eyes', 'happy', 'cười', 'mắt to'],
  '😄': ['grinning', 'smiling', 'eyes', 'happy', 'cười', 'mắt'],
  '😁': ['beaming', 'smile', 'happy', 'cười', 'tươi'],
  '😆': ['squinting', 'laughing', 'funny', 'cười', 'nhắm mắt'],
  '😅': ['sweat', 'smile', 'nervous', 'mồ hôi', 'lo lắng'],
  '🤣': ['rolling', 'floor', 'laughing', 'funny', 'cười ngã'],
  '😂': ['tears', 'joy', 'laughing', 'cười', 'nước mắt'],
  '🙂': ['slightly', 'smiling', 'neutral', 'cười nhẹ'],
  '🙃': ['upside', 'down', 'silly', 'ngược', 'ngốc'],
  '😉': ['winking', 'flirting', 'nháy mắt'],
  '😊': ['smiling', 'eyes', 'blush', 'cười', 'mắt'],
  '😇': ['halo', 'innocent', 'angel', 'thiên thần'],
  '🥰': ['hearts', 'love', 'cute', 'yêu', 'tim'],
  '😍': ['heart', 'eyes', 'love', 'yêu', 'tim mắt'],
  '🤩': ['star', 'struck', 'amazed', 'ngôi sao'],
  '😘': ['blowing', 'kiss', 'love', 'hôn gió'],
  '😗': ['kissing', 'love', 'hôn'],
  '😚': ['kissing', 'closed', 'eyes', 'hôn nhắm mắt'],
  '😙': ['kissing', 'smiling', 'eyes', 'hôn mỉm cười'],
  '😋': ['savouring', 'food', 'yummy', 'ăn ngon'],
  '😛': ['tongue', 'silly', 'lưỡi', 'ngốc'],
  '😜': ['winking', 'tongue', 'silly', 'nháy mắt lưỡi'],
  '🤪': ['zany', 'crazy', 'điên'],
  '😝': ['squinting', 'tongue', 'nhắm mắt lưỡi'],
  '🤑': ['money', 'mouth', 'rich', 'tiền'],
  '🤗': ['hugging', 'love', 'ôm'],
  '🤭': ['hand', 'over', 'mouth', 'secret', 'bí mật'],
  '🤫': ['shushing', 'quiet', 'im lặng'],
  '🤔': ['thinking', 'thought', 'suy nghĩ'],
  '🤐': ['zipper', 'mouth', 'im lặng'],
  '🤨': ['raised', 'eyebrow', 'suspicious', 'nghi ngờ'],
  '😐': ['neutral', 'expressionless', 'vô cảm'],
  '😑': ['expressionless', 'blank', 'trống rỗng'],
  '😶': ['mouth', 'silent', 'im lặng'],
  '😏': ['smirking', 'smug', 'đắc ý'],
  '😒': ['unamused', 'bored', 'chán'],
  '🙄': ['rolling', 'eyes', 'exasperated', 'mắt lăn'],
  '😬': ['grimacing', 'awkward', 'khó xử'],
  '🤥': ['lying', 'pinocchio', 'nói dối'],
  '😌': ['relieved', 'calm', 'nhẹ nhõm'],
  '😔': ['sad', 'pensive', 'buồn'],
  '😪': ['sleepy', 'tired', 'buồn ngủ'],
  '🤤': ['drooling', 'hungry', 'thèm'],
  '😴': ['sleeping', 'tired', 'ngủ'],
  '😷': ['mask', 'sick', 'khẩu trang'],
  '🤒': ['thermometer', 'sick', 'sốt'],
  '🤕': ['bandage', 'injured', 'băng đầu'],
  '🤢': ['nauseated', 'sick', 'buồn nôn'],
  '🤮': ['vomiting', 'sick', 'nôn'],
  '🤧': ['sneezing', 'sick', 'hắt hơi'],
  '🥵': ['hot', 'sweating', 'nóng'],
  '🥶': ['cold', 'freezing', 'lạnh'],
  '😵': ['dizzy', 'confused', 'chóng mặt'],
  '🤯': ['exploding', 'mind', 'blown', 'nổ não'],
  '🤠': ['cowboy', 'hat', 'cao bồi'],
  '🥳': ['party', 'celebrating', 'tiệc'],
  '😎': ['sunglasses', 'cool', 'kính râm'],
  '🤓': ['nerd', 'glasses', 'mọt sách'],
  '🧐': ['monocle', 'thinking', 'kính một mắt'],
  '😕': ['confused', 'worried', 'bối rối'],
  '😟': ['worried', 'concerned', 'lo lắng'],
  '🙁': ['slightly', 'frowning', 'buồn nhẹ'],
  '😮': ['open', 'mouth', 'surprised', 'ngạc nhiên'],
  '😯': ['hushed', 'surprised', 'bất ngờ'],
  '😲': ['astonished', 'shocked', 'sốc'],
  '😳': ['flushed', 'embarrassed', 'xấu hổ'],
  '🥺': ['pleading', 'puppy', 'eyes', 'xin'],
  '😦': ['frowning', 'open', 'mouth', 'nhăn nhó'],
  '😧': ['anguished', 'distressed', 'đau khổ'],
  '😨': ['fearful', 'scared', 'sợ hãi'],
  '😰': ['anxious', 'sweat', 'lo lắng'],
  '😥': ['sad', 'sweat', 'buồn'],
  '😢': ['crying', 'sad', 'khóc'],
  '😭': ['loudly', 'crying', 'khóc to'],
  '😱': ['screaming', 'fear', 'sợ hãi'],
  '😖': ['confounded', 'frustrated', 'bực bội'],
  '😣': ['persevering', 'struggling', 'cố gắng'],
  '😞': ['disappointed', 'sad', 'thất vọng'],
  '😓': ['downcast', 'sweat', 'thất vọng'],
  '😩': ['weary', 'tired', 'mệt mỏi'],
  '😫': ['tired', 'exhausted', 'kiệt sức'],
  '🥱': ['yawning', 'tired', 'ngáp'],
  '😤': ['triumph', 'proud', 'tự hào'],
  '😡': ['pouting', 'angry', 'tức giận'],
  '😠': ['angry', 'mad', 'tức giận'],
  '🤬': ['swearing', 'cursing', 'chửi'],
  '😈': ['smiling', 'devil', 'horn', 'quỷ cười'],
  '👿': ['angry', 'devil', 'horn', 'quỷ giận'],
  '💀': ['skull', 'death', 'sọ'],
  '☠️': ['skull', 'crossbones', 'sọ'],
  '💩': ['poop', 'poo', 'phân'],
  '🤡': ['clown', 'silly', 'hề'],
  '👹': ['ogre', 'monster', 'yêu tinh'],
  '👺': ['goblin', 'monster', 'yêu tinh'],
  '👻': ['ghost', 'spooky', 'ma'],
  '👽': ['alien', 'space', 'người ngoài hành tinh'],
  '👾': ['alien', 'monster', 'game', 'game'],
  '🤖': ['robot', 'bot', 'người máy'],
};

// Popular emojis organized by category
const EMOJI_CATEGORIES = {
  recently: { name: 'Gần đây', icon: '🕐', emojis: [] },
  smileys: {
    name: 'Smileys & People',
    icon: '😀',
    emojis: [
      '😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃',
      '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '😚', '😙',
      '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔',
      '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥',
      '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮',
      '🤧', '🥵', '🥶', '😶‍🌫️', '😵', '😵‍💫', '🤯', '🤠', '🥳', '😎',
      '🤓', '🧐', '😕', '😟', '🙁', '😮', '😯', '😲', '😳', '🥺',
      '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣',
      '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈',
      '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾',
      '🤖', '😺', '😸', '😹', '😻', '😼', '😽', '🙀', '😿', '😾'
    ]
  },
  animals: {
    name: 'Animals & Nature',
    icon: '🐱',
    emojis: [
      '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
      '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒',
      '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇',
      '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜',
      '🦟', '🦗', '🕷️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙',
      '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋',
      '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏',
      '🐪', '🐫', '🦒', '🦘', '🦬', '🐃', '🐂', '🐄', '🐎', '🐖',
      '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈',
      '🐈‍⬛', '🪶', '🐓', '🦃', '🦤', '🦚', '🦜', '🦢', '🦩', '🕊️',
      '🐇', '🦝', '🦨', '🦡', '🦫', '🦦', '🦥', '🐁', '🐀', '🐿️',
      '🦔', '🐾', '🐉', '🐲', '🌵', '🎄', '🌲', '🌳', '🌴', '🪵',
      '🌱', '🌿', '☘️', '🍀', '🎍', '🪴', '🎋', '🍃', '🍂', '🍁',
      '🍄', '🐚', '🪨', '🌾', '💐', '🌷', '🌹', '🥀', '🌺', '🌸',
      '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗',
      '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '🌎', '🌍', '🌏', '🪐',
      '💫', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈',
      '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '❄️',
      '☃️', '⛄', '🌨️', '💧', '💦', '☔', '☂️', '🌊', '🌫️'
    ]
  },
  food: {
    name: 'Food & Drink',
    icon: '🍔',
    emojis: [
      '🍏', '🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈',
      '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦',
      '🥬', '🥒', '🌶️', '🌽', '🥕', '🥔', '🍠', '🥐', '🥯', '🍞',
      '🥖', '🥨', '🧀', '🥚', '🍳', '🥞', '🥓', '🥩', '🍗', '🍖',
      '🦴', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯', '🥗',
      '🥘', '🥫', '🍝', '🍜', '🍲', '🍛', '🍣', '🍱', '🥟', '🦪',
      '🍤', '🍙', '🍚', '🍘', '🍥', '🥠', '🥮', '🍢', '🍡', '🍧',
      '🍨', '🍦', '🥧', '🧁', '🍰', '🎂', '🍮', '🍭', '🍬', '🍫',
      '🍿', '🍩', '🍪', '🌰', '🥜', '🍯', '🥛', '🍼', '☕️', '🍵',
      '🧃', '🥤', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹',
      '🧉', '🍾', '🧊'
    ]
  },
  activities: {
    name: 'Activities',
    icon: '⚽',
    emojis: [
      '⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱',
      '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🏹', '🎣',
      '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂',
      '🏋️‍♀️', '🏋️', '🤼‍♀️', '🤼‍♂️', '🤸‍♀️', '🤸‍♂️', '⛹️‍♀️', '⛹️', '🤺', '🤾‍♀️',
      '🤾‍♂️', '🏌️‍♀️', '🏌️', '🏇', '🧘‍♀️', '🧘‍♂️', '🏄‍♀️', '🏄', '🏊‍♀️', '🏊',
      '🤽‍♀️', '🤽‍♂️', '🚣‍♀️', '🚣', '🧗‍♀️', '🧗‍♂️', '🚵‍♀️', '🚵', '🚴‍♀️', '🚴',
      '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️',
      '🎪', '🤹‍♀️', '🤹‍♂️', '🎭', '🩰', '🎨', '🎬', '🎤', '🎧', '🎼',
      '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '♟️', '🎯',
      '🎳', '🎮', '🎰', '🧩'
    ]
  },
  travel: {
    name: 'Travel & Places',
    icon: '🚗',
    emojis: [
      '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
      '🚚', '🚛', '🚜', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔',
      '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝',
      '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫',
      '🛬', '🛩️', '💺', '🚁', '🛰️', '🚀', '🛸',
      '⛵', '🛶', '🚤', '🛥️', '🛳️', '⛴️', '🚢', '⚓', '⛽', '🚧',
      '🚦', '🚥', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡',
      '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️',
      '🗻', '🏕️', '⛺', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢',
      '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒',
      '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️', '🛤️', '🛣️', '🗾',
      '🎑', '🏞️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙️',
      '🌃', '🌌', '🌉', '🌁'
    ]
  },
  objects: {
    name: 'Objects',
    icon: '⌚',
    emojis: [
      '⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️',
      '🗜️', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️',
      '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️',
      '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡',
      '🔦', '🕯️', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰',
      '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩',
      '⚙️', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🔪', '🗡️', '⚔️',
      '🛡️', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️',
      '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠',
      '🧫', '🧪', '🌡️', '🧹', '🪠', '🧺', '🧻', '🚽', '🚿', '🛁',
      '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎️', '🔑', '🗝️',
      '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🖼️', '🪞', '🪟', '🛍️',
      '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🪅', '🎊', '🎉', '🎎',
      '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤',
      '📦', '🏷️', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃',
      '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅',
      '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️',
      '📌', '📍', '📎', '🖇️', '📏', '📐', '✂️'
    ]
  },
  symbols: {
    name: 'Symbols',
    icon: '❤️',
    emojis: [
      '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
      '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️',
      '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐',
      '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐',
      '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳',
      '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️',
      '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️',
      '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️',
      '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❓', '❕',
      '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️',
      '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠',
      'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂',
      '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶',
      '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🔢', '🔟', '#️⃣', '*️⃣',
      '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣',
      '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↖️', '↘️', '↙️', '↔️', '↕️',
      '🔄', '↪️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔼', '🔽', '⏫',
      '⏬', '⏩', '⏪', '⏭️', '⏮️'
    ]
  },
  flags: {
    name: 'Flags',
    icon: '🏳️',
    emojis: [
      '🏳️', '🏴', '🏁', '🚩', '🏳️‍🌈', '🏳️‍⚧️', '🇺🇳', '🇦🇫', '🇦🇽', '🇦🇱',
      '🇩🇿', '🇦🇸', '🇦🇩', '🇦🇴', '🇦🇮', '🇦🇶', '🇦🇬', '🇦🇷', '🇦🇲', '🇦🇼',
      '🇦🇺', '🇦🇹', '🇦🇿', '🇧🇸', '🇧🇭', '🇧🇩', '🇧🇧', '🇧🇾', '🇧🇪', '🇧🇿',
      '🇧🇯', '🇧🇲', '🇧🇹', '🇧🇴', '🇧🇦', '🇧🇼', '🇧🇷', '🇮🇴', '🇻🇬', '🇧🇳',
      '🇧🇬', '🇧🇫', '🇧🇮', '🇰🇭', '🇨🇲', '🇨🇦', '🇮🇶', '🇨🇻', '🇧🇶', '🇰🇾',
      '🇨🇫', '🇹🇩', '🇨🇱', '🇨🇳', '🇨🇽', '🇨🇨', '🇨🇴', '🇰🇲', '🇨🇬', '🇨🇩',
      '🇨🇰', '🇨🇷', '🇨🇮', '🇭🇷', '🇨🇺', '🇨🇼', '🇨🇾', '🇨🇿', '🇩🇰', '🇩🇯',
      '🇩🇲', '🇩🇴', '🇪🇨', '🇪🇬', '🇸🇻', '🇬🇶', '🇪🇷', '🇪🇪', '🇸🇿', '🇪🇹',
      '🇪🇺', '🇫🇰', '🇫🇴', '🇫🇯', '🇫🇮', '🇫🇷', '🇬🇫', '🇵🇫', '🇹🇫', '🇬🇦',
      '🇬🇲', '🇬🇪', '🇩🇪', '🇬🇭', '🇬🇮', '🇬🇷', '🇬🇱', '🇬🇩', '🇬🇵', '🇬🇺',
      '🇬🇹', '🇬🇬', '🇬🇳', '🇬🇼', '🇬🇾', '🇭🇹', '🇭🇳', '🇭🇰', '🇭🇺', '🇮🇸',
      '🇮🇳', '🇮🇩', '🇮🇷', '🇮🇶', '🇮🇪', '🇮🇲', '🇮🇱', '🇮🇹', '🇯🇲', '🇯🇵',
      '🎌', '🇯🇪', '🇯🇴', '🇰🇿', '🇰🇪', '🇰🇮', '🇰🇵', '🇰🇷', '🇰🇼', '🇰🇬',
      '🇱🇦', '🇱🇻', '🇱🇧', '🇱🇸', '🇱🇷', '🇱🇾', '🇱🇮', '🇱🇹', '🇱🇺', '🇲🇴',
      '🇲🇰', '🇲🇬', '🇲🇼', '🇲🇾', '🇲🇻', '🇲🇱', '🇲🇹', '🇲🇭', '🇲🇶', '🇲🇷',
      '🇲🇺', '🇾🇹', '🇲🇽', '🇫🇲', '🇲🇩', '🇲🇨', '🇲🇳', '🇲🇪', '🇲🇸', '🇲🇦',
      '🇲🇿', '🇲🇲', '🇳🇦', '🇳🇷', '🇳🇵', '🇳🇱', '🇳🇨', '🇳🇿', '🇳🇮', '🇳🇪',
      '🇳🇬', '🇳🇺', '🇳🇫', '🇰🇵', '🇲🇵', '🇳🇴', '🇴🇲', '🇵🇰', '🇵🇼', '🇵🇸',
      '🇵🇦', '🇵🇬', '🇵🇾', '🇵🇪', '🇵🇭', '🇵🇳', '🇵🇱', '🇵🇹', '🇵🇷', '🇶🇦',
      '🇷🇪', '🇷🇴', '🇷🇺', '🇷🇼', '🇼🇸', '🇸🇲', '🇸🇦', '🇸🇳', '🇷🇸', '🇸🇨',
      '🇸🇱', '🇸🇬', '🇸🇽', '🇸🇰', '🇸🇮', '🇸🇧', '🇸🇴', '🇿🇦', '🇬🇸', '🇰🇷',
      '🇸🇸', '🇪🇸', '🇱🇰', '🇧🇱', '🇸🇭', '🇰🇳', '🇱🇨', '🇵🇲', '🇻🇨', '🇸🇩',
      '🇸🇷', '🇸🇪', '🇨🇭', '🇸🇾', '🇹🇼', '🇹🇯', '🇹🇿', '🇹🇭', '🇹🇱', '🇹🇬',
      '🇹🇰', '🇹🇴', '🇹🇹', '🇹🇳', '🇹🇷', '🇹🇲', '🇹🇨', '🇹🇻', '🇺🇬', '🇺🇦',
      '🇦🇪', '🇬🇧', '🇺🇸', '🇺🇾', '🇺🇿', '🇻🇺', '🇻🇦', '🇻🇪', '🇻🇳', '🇼🇫',
      '🇪🇭', '🇾🇪', '🇿🇲', '🇿🇼'
    ]
  }
};

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeCategory, setActiveCategory] = useState<keyof typeof EMOJI_CATEGORIES>('smileys');
  const [searchQuery, setSearchQuery] = useState('');
  const [recentEmojis, setRecentEmojis] = useState<string[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('recent_emojis');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (pickerRef.current) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [onClose]);

  const handleEmojiSelect = useCallback((emoji: string) => {
    const updated = [emoji, ...recentEmojis.filter(e => e !== emoji)].slice(0, 24);
    setRecentEmojis(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('recent_emojis', JSON.stringify(updated));
    }
    onSelect(emoji);
  }, [onSelect, recentEmojis]);

  // Enhanced search with keywords
  const filteredEmojis = useMemo(() => {
    if (!searchQuery.trim()) {
      if (activeCategory === 'recently') {
        return recentEmojis;
      }
      return EMOJI_CATEGORIES[activeCategory].emojis;
    }

    const query = searchQuery.trim().toLowerCase();
    const allEmojisWithKeywords: Array<{ emoji: string; keywords: string[] }> = [];
    
    // Build emoji-keywords mapping
    Object.values(EMOJI_CATEGORIES).forEach(category => {
      if (category.emojis) {
        category.emojis.forEach(emoji => {
          const keywords = EMOJI_KEYWORDS[emoji] || [];
          allEmojisWithKeywords.push({ emoji, keywords });
        });
      }
    });

    // Filter by keywords
    const matched = allEmojisWithKeywords.filter(({ emoji, keywords }) => {
      // Check if query matches any keyword
      const matchesKeyword = keywords.some(keyword => keyword.toLowerCase().includes(query));
      // Also check if emoji itself contains query (for unicode search)
      const matchesEmoji = emoji.includes(query);
      return matchesKeyword || matchesEmoji;
    });

    // Remove duplicates and return emojis
    const uniqueEmojis = Array.from(new Set(matched.map(item => item.emoji)));
    return uniqueEmojis;
  }, [searchQuery, activeCategory, recentEmojis]);

  // Update recently used when category changes
  useEffect(() => {
    if (activeCategory === 'recently' && recentEmojis.length === 0) {
      setActiveCategory('smileys');
    }
  }, [activeCategory, recentEmojis]);

  return (
    <div 
      ref={pickerRef}
      onClick={(e) => e.stopPropagation()}
      style={{
        width: 360,
        height: 440,
        background: '#ffffff',
        border: '1px solid #e0e0e0',
        borderRadius: 12,
        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.15)',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}
    >
      {/* Search Bar */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #f0f0f0'
      }}>
        <div style={{
          background: '#ffffff',
          borderRadius: 6,
          padding: '8px 12px',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          border: '1px solid #4285f4',
          boxShadow: '0 0 0 1px #4285f4'
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search"
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              outline: 'none',
              fontSize: 14,
              color: '#111827'
            }}
            autoFocus
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                border: 'none',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Category Icons */}
      <div style={{
        display: 'flex',
        padding: '8px 12px',
        gap: 4,
        borderBottom: '1px solid #f0f0f0',
        overflowX: 'auto',
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {Object.entries(EMOJI_CATEGORIES).map(([key, category]) => {
          if (key === 'recently' && recentEmojis.length === 0) return null;
          
          return (
            <button
              key={key}
              onClick={() => {
                setActiveCategory(key as keyof typeof EMOJI_CATEGORIES);
                setSearchQuery('');
              }}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: 'none',
                background: activeCategory === key ? '#e8f0fe' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 20,
                flexShrink: 0,
                transition: 'background 0.2s'
              }}
              title={category.name}
              onMouseEnter={(e) => {
                if (activeCategory !== key) {
                  e.currentTarget.style.background = '#f5f5f5';
                }
              }}
              onMouseLeave={(e) => {
                if (activeCategory !== key) {
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              {category.icon}
            </button>
          );
        })}
      </div>

      {/* Category Name */}
      {!searchQuery && (
        <div style={{
          padding: '10px 12px',
          fontSize: 13,
          fontWeight: 600,
          color: '#5f6368',
          borderBottom: '1px solid #f0f0f0',
          background: '#fafafa'
        }}>
          {EMOJI_CATEGORIES[activeCategory].name}
        </div>
      )}

      {/* Emoji Grid */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px',
        display: 'grid',
        gridTemplateColumns: 'repeat(8, 1fr)',
        gap: 4,
        background: '#ffffff'
      }}>
        {filteredEmojis.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            textAlign: 'center',
            padding: '40px 0',
            color: '#9ca3af',
            fontSize: 14
          }}>
            Không tìm thấy emoji
          </div>
        ) : (
          filteredEmojis.map((emoji, index) => (
            <button
              key={`${emoji}-${index}`}
              onClick={() => handleEmojiSelect(emoji)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: 'none',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: 24,
                transition: 'background 0.2s',
                padding: 0
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f0f0f0';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
              title={EMOJI_KEYWORDS[emoji]?.join(', ') || ''}
            >
              {emoji}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
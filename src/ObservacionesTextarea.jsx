import React, { useState, useEffect } from 'react';

const ObservacionesTextarea = React.memo(({ value, onChange }) => {
  const [localValue, setLocalValue] = useState(value);
  useEffect(() => { setLocalValue(value); }, [value]);
  return (
    <textarea
      className="w-full p-3 bg-slate-50 border rounded-lg h-20"
      placeholder="Detalles adicionales..."
      value={localValue}
      onChange={e => setLocalValue(e.target.value)}
      onBlur={e => onChange(e.target.value)}
    />
  );
});

export default ObservacionesTextarea;

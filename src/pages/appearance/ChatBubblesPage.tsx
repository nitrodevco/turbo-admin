import { Upload } from 'lucide-react';
import { useState } from 'react';

import { useCanManageContent } from '#/api/content';
import { Button, PageBody, PageHeader } from '#/components/ui';
import { TakeInDialog } from '#/pages/content/chat-styles/TakeIn';
import { ChatStylesTab } from '#/pages/content/ChatStylesTab';

/**
 * Appearance > Chat bubbles: the chat bubbles players speak in, with the rest of what a designer
 * changes - each drawn as a room draws it, changed in place, copied, or given new art, and their
 * looks taken in from the header. A theme brings its own as data (its `chatstyles/` folder).
 */
export const ChatBubblesPage = () => {
    const canManage = useCanManageContent();
    const [ takingIn, setTakingIn ] = useState(false);

    return (
        <>
            <PageHeader
                title="Chat bubbles"
            >
                {canManage && <Button icon={<Upload />} onClick={() => setTakingIn(true)}>Take in</Button>}
            </PageHeader>
            <PageBody>
                <ChatStylesTab canManage={canManage} />
            </PageBody>
            <TakeInDialog open={takingIn} onClose={() => setTakingIn(false)} />
        </>
    );
};

/**
 * External dependencies
 */
import classnames from 'classnames';

/**
 * WordPress dependencies
 */
import { useSelect } from '@wordpress/data';
import { getDefaultBlockName } from '@wordpress/blocks';

/**
 * Internal dependencies
 */
import DefaultBlockAppender from '../default-block-appender';
import ButtonBlockAppender from '../button-block-appender';
import { store as blockEditorStore } from '../../store';
import { unlock } from '../../lock-unlock';

function DefaultAppender( { rootClientId } ) {
	const canInsertDefaultBlock = useSelect( ( select ) =>
		select( blockEditorStore ).canInsertBlockType(
			getDefaultBlockName(),
			rootClientId
		)
	);

	if ( canInsertDefaultBlock ) {
		// Render the default block appender if the context supports use
		// of the default appender.
		return <DefaultBlockAppender rootClientId={ rootClientId } />;
	}

	// Fallback in case the default block can't be inserted.
	return (
		<ButtonBlockAppender
			rootClientId={ rootClientId }
			className="block-list-appender__toggle"
		/>
	);
}

function useAppender( rootClientId, CustomAppender ) {
	const isVisible = useSelect(
		( select ) => {
			const {
				getTemplateLock,
				getSelectedBlockClientId,
				__unstableGetEditorMode,
				getBlockEditingMode,
			} = unlock( select( blockEditorStore ) );

			if ( CustomAppender === false ) {
				return false;
			}

			if ( ! CustomAppender ) {
				const selectedBlockClientId = getSelectedBlockClientId();
				const isParentSelected =
					rootClientId === selectedBlockClientId ||
					( ! rootClientId && ! selectedBlockClientId );
				if ( ! isParentSelected ) {
					return false;
				}
			}

			if (
				getTemplateLock( rootClientId ) ||
				getBlockEditingMode( rootClientId ) === 'disabled' ||
				__unstableGetEditorMode() === 'zoom-out'
			) {
				return false;
			}

			return true;
		},
		[ rootClientId, CustomAppender ]
	);

	if ( ! isVisible ) {
		return null;
	}

	return CustomAppender ? (
		<CustomAppender />
	) : (
		<DefaultAppender rootClientId={ rootClientId } />
	);
}

function BlockListAppender( {
	rootClientId,
	renderAppender,
	className,
	tagName: TagName = 'div',
} ) {
	const appender = useAppender( rootClientId, renderAppender );
	const isDragOver = useSelect(
		( select ) => {
			const {
				getBlockInsertionPoint,
				isBlockInsertionPointVisible,
				getBlockCount,
			} = select( blockEditorStore );
			const insertionPoint = getBlockInsertionPoint();
			// Ideally we should also check for `isDragging` but currently it
			// requires a lot more setup. We can revisit this once we refactor
			// the DnD utility hooks.
			return (
				isBlockInsertionPointVisible() &&
				rootClientId === insertionPoint?.rootClientId &&
				getBlockCount( rootClientId ) === 0
			);
		},
		[ rootClientId ]
	);

	if ( ! appender ) {
		return null;
	}

	return (
		<TagName
			// A `tabIndex` is used on the wrapping `div` element in order to
			// force a focus event to occur when an appender `button` element
			// is clicked. In some browsers (Firefox, Safari), button clicks do
			// not emit a focus event, which could cause this event to propagate
			// unexpectedly. The `tabIndex` ensures that the interaction is
			// captured as a focus, without also adding an extra tab stop.
			//
			// See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/button#Clicking_and_focus
			tabIndex={ -1 }
			className={ classnames( 'block-list-appender wp-block', className, {
				'is-drag-over': isDragOver,
			} ) }
			// Needed in case the whole editor is content editable (for multi
			// selection). It fixes an edge case where ArrowDown and ArrowRight
			// should collapse the selection to the end of that selection and
			// not into the appender.
			contentEditable={ false }
			// The appender exists to let you add the first Paragraph before
			// any is inserted. To that end, this appender should visually be
			// presented as a block. That means theme CSS should style it as if
			// it were an empty paragraph block. That means a `wp-block` class to
			// ensure the width is correct, and a [data-block] attribute to ensure
			// the correct margin is applied, especially for classic themes which
			// have commonly targeted that attribute for margins.
			data-block
		>
			{ appender }
		</TagName>
	);
}

export default BlockListAppender;

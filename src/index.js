/*------1.simple react*/
// const element = {
// 	type: 'h1',
// 	props: {
// 		title: 'foo',
// 		children: 'Hello'
// 	}
// }
// const container = document.getElementById('root')
// // ReactDom.render(element, container)
// const node = document.createElement(element.type)
// node['title'] = element.props.title
// const text = document.createTextNode('')
// text['nodeValue'] = element.props.children
// node.appendChild(text)
// container.appendChild(node)
/*-------2.createElement------*/

function createElement(type, props, ...children) {
	return {
		type,
		props: {
			...props,
			children:children.map(child=>
				typeof child === 'object'
					? child
					: createTextElement(child)
			)
		}
	}
}
function createTextElement(text) {
	return {
		type: 'TEXT_ELEMENT',
		props: {
			nodeValue: text,
			children: []
		}
	}
}
// function render(element, container) {
// 	const dom = element.type === 'TEXT_ELEMENT'
// 			? document.createTextNode('')
// 			: document.createElement(element.type)
// 	const isProperty = key => key !== 'children'
// 	Object.keys(element.props)
// 		.filter(isProperty)
// 		.forEach(name => {
// 			dom[name] = element.props[name]
// 		})
// 	element.props.children.forEach(child =>
// 		render(child,dom)
// 	)
// 	container.appendChild(dom)
// }
function createDom(fiber) {
	const dom =
		fiber.type === 'TEXT_ELEMENT'
			? document.createTextNode('')
			: document.createElement(fiber.type)
	updateDom(dom, {}, fiber.props)
	return dom
}
const isEvent = key => key.startsWith('on')
const isProperty = key => key!== 'children' && !isEvent(key)
const isNew = (prev, next) => key =>prev[key] !== next[key]
const isGone = (prev, next) => key => !(key in next)
function updateDom(dom, prevProps, nextProps) {
	// remove event listeners
	Object.keys(prevProps)
		.filter(isEvent)
		.filter(
			key => !(key in nextProps) || isNew(prevProps,nextProps)(key)
		).forEach(
			name => {
				const eventType = name
					.toLowerCase()
					.substring(2)
				dom.removeEventListener(eventType,prevProps[name])
			}
	)
	// Add event listeners
	Object.keys(nextProps)
		.filter(isEvent)
		.filter(isNew(prevProps, nextProps))
		.forEach(name => {
			const eventType = name
				.toLowerCase()
				.substring(2)
			dom.addEventListener(
				eventType,
				nextProps[name]
			)
		})
	Object.keys(prevProps)
		.filter(isProperty)
		.filter(isGone(prevProps, nextProps))
		.forEach(name => {
			dom[name] = ""
		})
	// debugger
	let obj=Object.keys(nextProps)
	Object.keys(nextProps)
		.filter(isProperty)
		.filter(isNew(prevProps, nextProps))
		.forEach(name=>{
			// debugger
			dom[name] = nextProps[name]
		})
}
function commitRoot() {
	// add node to dom
	deletions.forEach(commitWork)
	// debugger
	commitWork(wipRoot.child)
	currentRoot = wipRoot
	wipRoot = null
}

function commitWork(fiber) {
	if (!fiber) {
		return
	}
	let domParentFiber = fiber.parent
	while (!domParentFiber.dom){
		domParentFiber = domParentFiber.parent
	}
	const domParent = domParentFiber.dom
	// const domParent = fiber.parent.dom
	// domParent.appendChild(fiber.dom)
	if (fiber.effectTag === 'PLACEMENT' && fiber.dom !== null) {
		domParent.appendChild(fiber.dom)
	} else if (fiber.effectTag === 'DELETION') {
		commitDeletion(fiber, domParent)
	} else if (fiber.effectTag === 'UPDATE' && fiber.dom !== null) {
		updateDom(
			fiber.dom,
			fiber.alternate.props,
			fiber.props
		)
	}
	commitWork(fiber.child)
	commitWork(fiber.sibling)
}
function commitDeletion(fiber, domParent) {
	if (fiber.dom) {
		domParent.removeChild(fiber.dom)
	} else {
		commitDeletion(fiber.child, domParent)
	}
}
function render(element, container) {
	// debugger
	wipRoot = {
		dom: container,
		props: {
			children: [element]
		},
		alternate: currentRoot
	}
	deletions = []
	nextUnitOfWork = wipRoot
}
let nextUnitOfWork = null
let wipRoot = null
let currentRoot = null
let deletions = null
function workLoop(deadline) {
	let shouldYield = false
	while (nextUnitOfWork && !shouldYield) {
		nextUnitOfWork = performUnitOfWork(
			nextUnitOfWork
		)
		shouldYield = deadline.timeRemaining() < 1
	}
	if (!nextUnitOfWork && wipRoot) {
		commitRoot()
	}
	requestIdleCallback(workLoop)
}
requestIdleCallback(workLoop)

function performUnitOfWork(fiber) {
	//set the first and return the next unit of the work
	//1.add dom node
	const isFunctionComponent = fiber.type instanceof Function
	if (isFunctionComponent) {
		updateFunctionComponent(fiber)
	} else {
		updateHostComponent(fiber)
	}
	//3.return next unit of work
	if (fiber.child) {
		return fiber.child
	}
	let nextFiber = fiber
	while (nextFiber) {
		if (nextFiber.sibling) {
			return nextFiber.sibling
		}
		nextFiber = nextFiber.parent
	}
}
let wipFiber = null
let hookIndex = null
function updateFunctionComponent(fiber) {
	wipFiber = fiber
	hookIndex = 0
	wipFiber.hooks = []
	const children = [fiber.type(fiber.props)]
	reconcileChildren(fiber, children)
}
function useState(initial) {
	const oldHook =
		wipFiber.alternate &&
		wipFiber.alternate.hooks &&
		wipFiber.alternate.hooks[hookIndex]
	const hook = {
		state: oldHook ? oldHook.state : initial,
		queue: []
	}
	const actions = oldHook ? oldHook.queue : []
	actions.forEach(action=>{
		debugger
		hook.state = action(hook.state)
	})
	const setState = action => {
		hook.queue.push(action)
		wipRoot = {
			dom: currentRoot.dom,
			props: currentRoot.props,
			alternate: currentRoot
		}
		nextUnitOfWork = wipRoot
		deletions = []
	}
	wipFiber.hooks.push(hook)
	hookIndex++
	return [hook.state,setState]
}
function updateHostComponent(fiber) {
	if (!fiber.dom) {
		fiber.dom = createDom(fiber)
	}
	// if (fiber.parent) {
	// 	fiber.parent.dom.appendChild(fiber.dom)
	// }
	//2.foreach child and create new fiber
	const elements = fiber.props.children
	reconcileChildren(fiber, elements)
}
function reconcileChildren(wipFiber, elements) {
	let index = 0
	let oldFiber = wipFiber.alternate && wipFiber.alternate.child
	let prevSibling = null
	while (
		index < elements.length || oldFiber !== null
		){
		const element = elements[index]
		let newFiber = null
		const sameType = oldFiber && element && element.type === oldFiber.type
		if (sameType) {
			//update the node
			newFiber = {
				type: oldFiber.type,
				props: element.props,
				dom: oldFiber.dom,
				parent: wipFiber,
				alternate: oldFiber,
				effectTag: 'UPDATE'
			}
		}
		if (!sameType && element) {
			// add this node
			newFiber = {
				type: element.type,
				props: element.props,
				dom: null,
				parent: wipFiber,
				alternate: null,
					effectTag: 'PLACEMENT'
			}
		}
		if (oldFiber && !sameType) {
			// delete oldFiber's node
			oldFiber.effectTag = 'DELETION'
			deletions.push(oldFiber)
		}
		debugger
		if (index === 0) {
			wipFiber.child = newFiber
		} else {
			prevSibling.sibing = newFiber
		}
		prevSibling = newFiber
		index++
	}
	while (index < elements.length) {

		const element = elements[index]

		const newFiber = {
			type: element.type,
			props: element.props,
			parent: fiber,
			dom: null
		}


	}
}
const Didact = {
	createElement,
	render,
	useState
}
/** @jsx Didact.createElement */
// const element = (
// 	<div id="foo">
// 		<a >bar</a>
// 		<b/>
// 	</div>
// )
// function Counter() {
// 	const [state, setState] = Didact.useState(1)
// 	return (
// 		<h1 onClick={() => setState(c => c + 1)}>
// 			Count: {state}
// 		</h1>
// 	)
// }
function Counter() {
	const [state, setState] = Didact.useState(1);
	return Didact.createElement("h1", {
		onClick: () => setState(c => c + 1)
	}, "Count: ", state);
}
const element = Didact.createElement(Counter)
// const element = Didact.createElement(
// 	'div',
// 	{id: 'foo'},
// 	Didact.createElement('a', null, 'bar'),
// 	Didact.createElement('b')
// )
const container = document.getElementById('root')
// ReactDom.render(element, container)
Didact.render(element, container)

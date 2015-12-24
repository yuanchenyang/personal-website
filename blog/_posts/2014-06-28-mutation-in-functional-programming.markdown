---
layout: post
title:  "Mutation in Functional Programming"
date:   2014-06-28 19:00:00
categories: functional-programming
---

A *pure function* is a function that always evaluates to the same results given
the same inputs, and does not produce any side effects in the process. There are many advantages to using pure functions. In this blog post I will show how we can still effectively use pure functions to handle state. Most of my code examples would be in Python, but I also show equivalent Haskell code for some examples. Only basic knowledge of Haskell syntax and its type system is needed to understand the Haskell code, and I believe that looking at the type signatures of the Haskell functions would help in understanding the Python code too.

As this is my first technical blog post, I might not be very clear in explaining everything. If you have any clarifications, please leave a comment below so that I can improve this post!

We can represent a stack in python using a list.

{% highlight python %}
>>> stack = [1,2,3,4]
>>> stack.pop(0)
1
>>> stack
[2,3,4]
>>> stack.insert(0, 5)
>>> stack
[5,2,3,4]
{% endhighlight %}

However this representation involves mutating the list. We want our `push` and `pop` functions to be pure instead. To do this, we will represent a stack as an immutable tuple. Any function that does a computation to a stack takes in the current stack and returns a tuple of the new stack and the result of the computation. Here is the definition of `pop_stack`:

{% highlight python %}
def pop_stack(stack):
    return stack[1:], stack[0]

>>> pop_stack((1,2,3))
((2, 3), 1)
{% endhighlight %}

The first element of the returned tuple, `(2, 3)`, is the new stack, and the second element, `1`, is the popped-off value. Similarly, we can define `push_stack`:

{% highlight python %}
def push_stack(num):
    return lambda stack: ((num,) + stack, None)

>>> push_stack(1)((2,3,4))
((1,2,3,4), None)
{% endhighlight %}

`push_stack` takes in an element, and returns a function that takes in a stack and pushes that element onto the stack. It does not return anything other than the new stack, but we want to keep a consistent structure for the returned value, so we return `None` for the second tuple element.

Now we've created the basic building blocks for manipulating a stack, we can define other functions combining `push` and `pop` together. Let's write `pop_second`, which pops off the second element of the stack:

{% highlight python %}
def pop_second(stack):
    s1, x1 = pop_stack(stack)
    s2, x2 = pop_stack(s1)
    s3, x3 = push_stack(s2, x1)
    return s3, x2

>>> pop_second((1,2,3,4))
((1, 3, 4), 2)
{% endhighlight %}

This implementation is purely functional but there's a lot of repetition: we do not need to use all of `x1`, `x2` and `x3` , and we always pass the states `s1`, `s2` and `s3` to the next step of computation. Let's introduce some abstractions to help us factor out some common patterns. In the following examples, I will write the equivalent Haskell code beside the Python code.

First, we notice that `pop(x)` and `push` are both functions that take in a state and return a tuple `(new_state, result)`. Let's define a class `StateFn` that encapsulates a function that acts on a state:

<columns>
{% highlight python %}
class StateFn:
    def __init__(self, fn):
        self.fn = fn
{% endhighlight %}

{% highlight haskell %}
type Stack = [Int]
data MyState s a = MyState (s -> (s, a))
{% endhighlight %}
</columns>

Next, we need a way to compose two state functions together. We will define a method `bind`, which takes in `fn`, a function that takes in a value and returns a state function. `bind` will return a new `StateFn`, which is the composition of `fn` with the encapsulated `self.fn`. The `StateFn` object that `bind` returns contain a function that takes in a state, computes `self.fn` on that state, resulting in a result and a new state. The result is passed to `fn`, which will return another `StateFn`. The new state is then passed to the returned `StateFn` and the result is returned. This may sound a little complicated, but it will be clearer once we see how `bind` is used.

<columns>
{% highlight python %}
def bind(self, fn):
    def state_fn(state):
        next_state, result = self.fn(state)
        new_state_fn = fn(result)
        return new_state_fn.fn(next_state)
    return StateFn(state_fn)
{% endhighlight %}

{% highlight haskell %}
instance Monad (MyState s) where
  (>>=) (MyState myFn) fn = MyState $ \state ->
    let (nextState, result) = myFn state
        MyState newStateFn = fn result
    in newStateFn nextState
{% endhighlight %}
</columns>

What if we do not want to keep the result of the computation? For example, `push` does not return anything other than the new stack, so we can discard its result, `None`. We do this by defining `then`, which takes in a `StateFn` and returns a function that takes in a state, do the computation for `self.fn` and discards the result, and then use the resulting state to do the computation with the instance of `StateFn`, finally returning that result.

<columns>
{% highlight python %}
def then(self, state_fn):
    return self.bind(lambda _: state_fn)
{% endhighlight %}

{% highlight haskell %}
(>>) a b = a >>= \_ -> b
{% endhighlight %}
</columns>

Finally, if we have a value and want to enclose it in a `StateFn` object, we define `ret_state` that does that:

<columns>
{% highlight python %}
def ret_state(a):
    return StateFn(lambda st: (st, a))
{% endhighlight %}

{% highlight haskell %}
return a = MyState $ \st -> (st, a)
{% endhighlight %}
</columns>

Now that we have these new abstractions, we can define `StateFn` instances `push` and `pop`, which contains functions that act on a stack.

<columns>
{% highlight python %}
push = lambda x: StateFn(lambda stk:
                         ((x,) + stk, None))

pop = StateFn(lambda stk: (stk[1:], stk[0]))
{% endhighlight %}

{% highlight haskell %}
push :: Int -> MyState Stack ()
push x = MyState $ \s -> (x:s, ())

pop :: MyState Stack Int
pop = MyState $ \(x:xs) -> (xs, x)
{% endhighlight %}
</columns>

Finally, we need to define a `run_stack` function that takes in a `StateFn` and a stack, and applies the function to the stack.

<columns>
{% highlight python %}
def run_stack(stack, state_fn):
    return state_fn.fn(stack)
{% endhighlight %}

{% highlight haskell %}
runStack :: Stack -> MyState Stack a -> (Stack, a)
runStack s (MyState f) =  f s
{% endhighlight %}
</columns>

Now we can perform push and pop operations on our stack!

<columns>
{% highlight python %}
>>> run_stack((2, 3, 4), push(1))
((1, 2, 3, 4), None)
>>> run_stack((2, 3, 4), pop)
((3, 4), 2)
>>> run_stack((2, 3, 4), ret_state(1))
((2, 3, 4), 1)
{% endhighlight %}

{% highlight haskell %}
> runStack [2,3,4] $ push 1
([1,2,3,4],())
> runStack [2,3,4] pop
([3,4],2)
> runStack [2,3,4] $ return 1
([2,3,4],1)
{% endhighlight %}
</columns>

We can easily compose `push` and `pop` with `bind` and `then`:

<columns>
{% highlight python %}
>>> inc_top = pop.bind(lambda x: push(x+1))
>>> run_stack((1, 2, 3), inc_top)
((2, 2, 3), None)
>>> pop_twice = pop.then(pop)
>>> run_stack((1, 2, 3, 4), pop_twice)
((3, 4), 2)
{% endhighlight %}

{% highlight haskell %}
> let incTop = pop >>= (\x -> push (x + 1))
> runStack [1,2,3] incTop
([2,2,3],())
> let popTwice = pop >> pop
> runStack [1,2,3,4] popTwice
([3,4],2)
{% endhighlight %}
</columns>

Here `inc_top` composes `pop` with `push` that pushes the popped value on top of the stack. `pop_twice` first performs a pop, discards its result and pops off the stack again. We notice that the functional syntax for `bind` and `then` in Python is a bit cumbersome compared to the operator notation in Haskell, so we overload the `>=` and `>>` operators in Python:

{% highlight python %}
def __rshift__(self, other):  # >>
    return self.then(other)

def __ge__(self, other):      # >=
    return self.bind(other)
{% endhighlight %}

Now we can write `pop_second` using our new abstraction!

<columns>
{% highlight python %}
pop_second = pop >= (lambda fst:
             pop >= (lambda snd:
             push(fst) >>
             ret_state(snd)))
{% endhighlight %}

{% highlight haskell %}
popSecond :: MyState Stack Int
popSecond = do fst <- pop
               snd <- pop
               push fst
               return snd
{% endhighlight %}
</columns>

Notice that Haskell already provides synthetic sugar for `bind` and `then` operations, which makes the pure functional code look almost the same as imperative code.

So in our quest for finding a good abstraction for chaining pure functions to manipulate states, we have discovered a specific form of a even higher level of abstraction, *monads*. In Haskell, the `Monad` typeclass has the following signature:

<columns>
{% highlight python %}
class Monad:
    def __init__(self, a):
        self.a = a
    def bind(self, fn):
        raise Exception("Not implemented!")
    def then(self, state_fn):
        return self.bind(lambda _: state_fn)
    def __rshift__(self, other):  # >>
        return self.then(other)
    def __ge__(self, other):      # >=
        return self.bind(other)
{% endhighlight %}

{% highlight haskell %}
class Monad m where
    -- Bind: Sequentially compose two actions,
    -- passing any value produced by the first
    -- as an argument to the second.
    (>>=)       :: m a -> (a -> m b) -> m b
    -- Then: Sequentially compose two actions,
    -- discarding any value produced by the
    -- first, like sequencing operators (such
    -- as the semicolon) in imperative
    -- languages.
    (>>)        ::  m a -> m b -> m b
    -- Inject a value into the monadic type.
    return      :: a -> m a
{% endhighlight %}
</columns>

For another example, lists are instances of monads. We can think of `return a` as putting `a` into a list, and `bind` takes in a function which accepts an element of a list, and returns another list. `bind` will apply that function to every element of the list and concatenate all the returned lists together. Here are the implementations of the list monad in Python and Haskell:

<columns>
{% highlight python %}
class List(Monad, list):
    def __init__(self, a):
        list.__init__(self, a)
        Monad.__init__(self, a)
    def bind(self, fn):
        from operator import add
        return List(reduce(add,
                           map(fn, self.a)))

def ret_lst(a):
    return List([a])

>>> l = List([1,2,3,4])
>>> l >= (lambda x: [x,x])
[1, 1, 2, 2, 3, 3, 4, 4]
{% endhighlight %}

{% highlight haskell %}
instance Monad [] where
  (>>=) a f = concat $ map f a
  return a = [a]

> let l = [1,2,3,4]
> l >>= (\x -> [x,x])
[1,1,2,2,3,3,4,4]
{% endhighlight %}
</columns>

Monads should satisfy the following axioms:

{% highlight haskell %}
(return a) >>= k  ==  k a
m >>= return  ==  m
m >>= (\x -> k x >>= h)  ==  (m >>= k) >>= h
{% endhighlight %}

1. `return a` puts the value a into a monad, and `>>=` takes that value out of the monad and passes it into `k`, which is the same as applying `k` to `a`.
2. `m >>= return` will take out the value wrapped in `m` and pass it to `return`, which will wrap it in a monad again. This is an identity transform.
3. This basically says that you can compose binds together.

The `StateFn` and `List` objects we created are examples of monads, as we defined `bind`, `then`, and `ret_{state,lst}` for each. In fact, we can think of a monad as an interface, any object with these three functions defined can be considered a monad. Many structures in Haskell, such as `Maybe` and `IO` are monads. We can define functions on monads assuming that the axioms described above hold, and these functions can be used on any monad. For example, the `filterM` function behaves like the normal filter function, just that it acts on monads. If you represent a set as a list, you can use `filterM` on the list, which is a monad, to find the power-set:

{% highlight haskell %}
> import Control.Monad
> filterM (\x -> [True, False]) [1,2,3]
[[1,2,3],[1,2],[1,3],[1],[2,3],[2],[3],[]]
{% endhighlight %}

As you can see, monads are very general and powerful abstractions. If you want to learn more about them, the monad chapters of [Learn You A Haskell][lyah] and [Real World Haskell][rwh] are great resources.

<!--
Let's define `filterM`, a function that takes in a filtered version of

<column>
{% highlight python %}

{% endhighlight %}

{% highlight haskell %}

{% endhighlight %}
</column>
-->

[lyah]:     http://learnyouahaskell.com/chapters
[rwh]:      http://book.realworldhaskell.org/read/monads.html

# Contribution weighted voting

## Overview

This canister implements a voting system where the weight of a voter's vote is determined by their contribution to the poll.

## Methods

<dl>
    <dt>createPoll:</dt>
    <dd>Anyone can create a new poll with the following information: Name of the poll, Voting options and Voting deadline.</dd>
    <dt>getPollByName:</dt>
    <dd>Anyone can get information about a poll by its name. Only the owner of the poll can get detailed information.</dd>
    <dt>getAllPolls:</dt>
    <dd>Anyone can get information about all polls. Only the owner of the polls can get detailed information.</dd>
    <dt>registerVoterToPoll:</dt>
    <dd>Anyone can register themselves as a voter on the poll. The initial value of the voter's contribution is 1.0.</dd>
    <dt>changeVoterContribution:</dt>
    <dd>Only the owner of the poll can change the contribution of a voter. The owner's own contribution cannot be changed.</dd>
    <dt>voteToPoll:</dt>
    <dd>Only registered voters can vote to the poll.</dd>
    <dt>getVotingResult:</dt>
    <dd>After the poll closes, the owner of the poll and the voters can get the voting results.</dd>
</dl>

## Test

The tests are written in bats.  I used bats because I did not know how to change the principal of the canister caller in 'azle/test'.

## Remaining issues

* Bats hangs on last test, use Ctrl-C to continue.

## Contribution

Contributions are welcome. Please open an issue or submit a pull request.

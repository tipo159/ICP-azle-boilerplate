# Contribution weighted voting

## Overview

This canister implements a voting system where the weight of a voter's vote is determined by their contribution to the poll.

## Methods

<dl>
    <dt>createPoll(payload: PollPayload): Result&lt;Poll, string&gt;</dt>
    <dd>Anyone can create a new poll with the following information: Name of the poll, Voting options and Voting deadline.</dd>
    <dt>getPollByName(name: string): Result&lt;Poll, string&gt;</dt>
    <dd>Anyone can get information about a poll by its name. Only the owner of the poll can get detailed information.</dd>
    <dt>getAllPolls(): Vec&lt;Poll&gt;</dt>
    <dd>Anyone can get information about all polls. Only the owner of the polls can get detailed information.</dd>
    <dt>registerVoterToPoll(pollname: string, votername: string): Result&lt;Voter, string&gt;</dt>
    <dd>Anyone can register themselves as a voter on the poll. The initial value of the voter's contribution is 1.0.</dd>
    <dt>changeVoterContribution(pollname: string, votername: string, contribution: float32): Result&lt;Voter, string&gt;</dt>
    <dd>Only the owner of the poll can change the contribution of a voter. The owner's own contribution cannot be changed.</dd>
    <dt>voteToPoll(pollname: string, votername: string, option: string): Result&lt;VotingDetail, string&gt;</dt>
    <dd>Only registered voters can vote to the poll.</dd>
    <dt>getVotingResult(name: string): Result&lt;Vec&lt;string&gt;, string&gt;</dt>
    <dd>After the poll closes, the owner of the poll and the voters can get the voting results.</dd>
    <dt>removeExpiredPolls(overTime: int32): Vec&lt;Poll&gt;</dt>
    <dd>Remove polls that have expired the voting deadline.</dd>
</dl>

## Test

The tests are written in bats.  I used bats because I did not know how to change the principal of the canister caller in 'azle/test'.

## Remaining issues

* Bats hangs on last test, use Ctrl-C to continue.

## Contribution

Contributions are welcome. Please open an issue or submit a pull request.
